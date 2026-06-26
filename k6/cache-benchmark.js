import http from 'k6/http';
import { sleep, check } from 'k6';

const BASE_URL = 'https://api.kwakmath.co.kr/api/v1';

const STUDENTS = [
  { loginId: 'student1', password: 'Example1!' },
  { loginId: 'student2', password: 'Example1!' },
  { loginId: 'student3', password: 'Example1!' },
];

const PARENTS = [
  { loginId: 'parent1', password: 'Example1!' },
  { loginId: 'parent2', password: 'Example1!' },
];

export const options = {
  scenarios: {
    student_scenario: {
      executor: 'constant-vus',
      exec: 'studentScenario',
      vus: 3,
      duration: '2m',
    },
    parent_scenario: {
      executor: 'constant-vus',
      exec: 'parentScenario',
      vus: 2,
      duration: '2m',
    },
  },
  thresholds: {
    // 캐시 적용 API만 측정
    'http_req_duration{name:GET /students/me/classes}':           ['p(50)<200', 'p(95)<500'],
    'http_req_duration{name:GET /classes/:classId/notices}':      ['p(50)<200', 'p(95)<500'],
    'http_req_duration{name:GET /students/materials}':            ['p(50)<200', 'p(95)<500'],
    'http_req_duration{name:GET /classes/:classId/notices (parent)}': ['p(50)<200', 'p(95)<500'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function parseData(res) {
  try {
    return res.json()?.data ?? null;
  } catch (_) {
    return null;
  }
}

// VU별 로그인 상태 (iteration 간 유지)
let loggedIn = false;
const savedCookies = { Authentication: null, Refresh: null };

function login(creds) {
  const res = http.post(
    `${BASE_URL}/auth/sign-in`,
    JSON.stringify({ loginId: creds.loginId, password: creds.password }),
    { headers: JSON_HEADERS },
  );
  const success = check(res, { 'login 201': (r) => r.status === 201 });
  if (success) {
    savedCookies.Authentication = res.cookies['Authentication']?.[0]?.value ?? null;
    savedCookies.Refresh = res.cookies['Refresh']?.[0]?.value ?? null;
  }
  return success;
}

function injectCookies() {
  const jar = http.cookieJar();
  if (savedCookies.Authentication) jar.set(BASE_URL, 'Authentication', savedCookies.Authentication);
  if (savedCookies.Refresh) jar.set(BASE_URL, 'Refresh', savedCookies.Refresh);
}

// ─────────────────────────────────────────────
// 학생 시나리오 — 캐시 적용 API: classes, notices, materials
// ─────────────────────────────────────────────
export function studentScenario() {
  const creds = STUDENTS[(__VU - 1) % STUDENTS.length];

  if (!loggedIn) {
    loggedIn = login(creds);
    sleep(0.5);
    if (!loggedIn) return;
  } else {
    injectCookies();
  }

  // ✅ 캐시: studentUserClassesList(userId)
  const classesRes = http.get(`${BASE_URL}/students/me/classes`, {
    tags: { name: 'GET /students/me/classes' },
  });
  check(classesRes, { '[student] classes 200': (r) => r.status === 200 });
  sleep(0.05);

  const classes = parseData(classesRes);
  if (!classes || classes.length === 0) return;
  const classId = classes[0].classId;

  // ✅ 캐시: studentClassNoticesListPage1(classId, ver)
  const noticesRes = http.get(`${BASE_URL}/classes/${classId}/notices`, {
    tags: { name: 'GET /classes/:classId/notices' },
  });
  check(noticesRes, { '[student] notices 200': (r) => r.status === 200 });
  sleep(0.05);

  // ✅ 캐시: studentClassMaterialsListPage1(classId, ver)
  const materialsRes = http.get(`${BASE_URL}/students/materials?classId=${classId}`, {
    tags: { name: 'GET /students/materials' },
  });
  check(materialsRes, { '[student] materials 200': (r) => r.status === 200 });
  sleep(0.05);
}

// ─────────────────────────────────────────────
// 학부모 시나리오 — 캐시 적용 API: notices
// ─────────────────────────────────────────────
export function parentScenario() {
  const creds = PARENTS[(__VU - 1) % PARENTS.length];

  if (!loggedIn) {
    loggedIn = login(creds);
    sleep(0.5);
    if (!loggedIn) return;
  } else {
    injectCookies();
  }

  // 비캐시 (classId 확보용)
  const childrenRes = http.get(`${BASE_URL}/parents/me/students`);
  const children = parseData(childrenRes);
  if (!children || children.length === 0) return;
  const studentId = children[0].studentId;
  sleep(0.05);

  const classesRes = http.get(`${BASE_URL}/parents/me/students/${studentId}/classes`);
  const classes = parseData(classesRes);
  if (!classes || classes.length === 0) return;
  const classId = classes[0].classId;
  sleep(0.05);

  // ✅ 캐시: parentClassNoticesListPage1(classId, ver)
  const noticesRes = http.get(`${BASE_URL}/classes/${classId}/notices`, {
    tags: { name: 'GET /classes/:classId/notices (parent)' },
  });
  check(noticesRes, { '[parent] notices 200': (r) => r.status === 200 });
  sleep(0.05);
}
