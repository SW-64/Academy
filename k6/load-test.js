import http from 'k6/http';
import { sleep, check } from 'k6';

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────
// TODO: EC2 서버 주소로 교체
const BASE_URL = __ENV.BASE_URL;

const STUDENTS = [
  { loginId: 'student1', password: 'Example1!' },
  { loginId: 'student2', password: 'Example1!' },
  { loginId: 'student3', password: 'Example1!' },
  { loginId: 'student4', password: 'Example1!' },
  { loginId: 'student5', password: 'Example1!' },
  { loginId: 'student6', password: 'Example1!' },
  { loginId: 'student7', password: 'Example1!' },
  { loginId: 'student8', password: 'Example1!' },
  { loginId: 'student9', password: 'Example1!' },
  { loginId: 'student10', password: 'Example1!' },
  { loginId: 'student11', password: 'Example1!' },
  { loginId: 'student12', password: 'Example1!' },
  { loginId: 'student13', password: 'Example1!' },
  { loginId: 'student14', password: 'Example1!' },
  { loginId: 'student15', password: 'Example1!' },
  { loginId: 'student16', password: 'Example1!' },
  { loginId: 'student17', password: 'Example1!' },
  { loginId: 'student18', password: 'Example1!' },
  { loginId: 'student19', password: 'Example1!' },
  { loginId: 'student20', password: 'Example1!' },
  { loginId: 'student21', password: 'Example1!' },
  { loginId: 'student22', password: 'Example1!' },
  { loginId: 'student23', password: 'Example1!' },
  { loginId: 'student24', password: 'Example1!' },
  { loginId: 'student25', password: 'Example1!' },
  { loginId: 'student26', password: 'Example1!' },
  { loginId: 'student27', password: 'Example1!' },
  { loginId: 'student28', password: 'Example1!' },
  { loginId: 'student29', password: 'Example1!' },
  { loginId: 'student30', password: 'Example1!' },
  { loginId: 'student31', password: 'Example1!' },
  { loginId: 'student32', password: 'Example1!' },
  { loginId: 'student33', password: 'Example1!' },
  { loginId: 'student34', password: 'Example1!' },
  { loginId: 'student35', password: 'Example1!' },
  { loginId: 'student36', password: 'Example1!' },
  { loginId: 'student37', password: 'Example1!' },
  { loginId: 'student38', password: 'Example1!' },
  { loginId: 'student39', password: 'Example1!' },
  { loginId: 'student40', password: 'Example1!' },
  { loginId: 'student41', password: 'Example1!' },
  { loginId: 'student42', password: 'Example1!' },
  { loginId: 'student43', password: 'Example1!' },
  { loginId: 'student44', password: 'Example1!' },
  { loginId: 'student45', password: 'Example1!' },
  { loginId: 'student46', password: 'Example1!' },
  { loginId: 'student47', password: 'Example1!' },
  { loginId: 'student48', password: 'Example1!' },
  { loginId: 'student49', password: 'Example1!' },
  { loginId: 'student50', password: 'Example1!' },
  { loginId: 'student51', password: 'Example1!' },
  { loginId: 'student52', password: 'Example1!' },
  { loginId: 'student53', password: 'Example1!' },
  { loginId: 'student54', password: 'Example1!' },
  { loginId: 'student55', password: 'Example1!' },
  { loginId: 'student56', password: 'Example1!' },
  { loginId: 'student57', password: 'Example1!' },
  { loginId: 'student58', password: 'Example1!' },
  { loginId: 'student59', password: 'Example1!' },
  { loginId: 'student60', password: 'Example1!' },
  { loginId: 'student61', password: 'Example1!' },
  { loginId: 'student62', password: 'Example1!' },
  { loginId: 'student63', password: 'Example1!' },
  { loginId: 'student64', password: 'Example1!' },
  { loginId: 'student65', password: 'Example1!' },
  { loginId: 'student66', password: 'Example1!' },
  { loginId: 'student67', password: 'Example1!' },
  { loginId: 'student68', password: 'Example1!' },
  { loginId: 'student69', password: 'Example1!' },
  { loginId: 'student70', password: 'Example1!' },
  { loginId: 'student71', password: 'Example1!' },
  { loginId: 'student72', password: 'Example1!' },
  { loginId: 'student73', password: 'Example1!' },
  { loginId: 'student74', password: 'Example1!' },
  { loginId: 'student75', password: 'Example1!' },
  { loginId: 'student76', password: 'Example1!' },
  { loginId: 'student77', password: 'Example1!' },
  { loginId: 'student78', password: 'Example1!' },
  { loginId: 'student79', password: 'Example1!' },
  { loginId: 'student80', password: 'Example1!' },
  { loginId: 'student81', password: 'Example1!' },
  { loginId: 'student82', password: 'Example1!' },
  { loginId: 'student83', password: 'Example1!' },
  { loginId: 'student84', password: 'Example1!' },
  { loginId: 'student85', password: 'Example1!' },
  { loginId: 'student86', password: 'Example1!' },
  { loginId: 'student87', password: 'Example1!' },
  { loginId: 'student88', password: 'Example1!' },
  { loginId: 'student89', password: 'Example1!' },
  { loginId: 'student90', password: 'Example1!' },
  { loginId: 'student91', password: 'Example1!' },
  { loginId: 'student92', password: 'Example1!' },
  { loginId: 'student93', password: 'Example1!' },
  { loginId: 'student94', password: 'Example1!' },
  { loginId: 'student95', password: 'Example1!' },
  { loginId: 'student96', password: 'Example1!' },
  { loginId: 'student97', password: 'Example1!' },
  { loginId: 'student98', password: 'Example1!' },
  { loginId: 'student99', password: 'Example1!' },
  { loginId: 'student100', password: 'Example1!' },
  { loginId: 'student101', password: 'Example1!' },
  { loginId: 'student102', password: 'Example1!' },
  { loginId: 'student103', password: 'Example1!' },
  { loginId: 'student104', password: 'Example1!' },
  { loginId: 'student105', password: 'Example1!' },
  { loginId: 'student106', password: 'Example1!' },
  { loginId: 'student107', password: 'Example1!' },
  { loginId: 'student108', password: 'Example1!' },
  { loginId: 'student109', password: 'Example1!' },
  { loginId: 'student110', password: 'Example1!' },
  { loginId: 'student111', password: 'Example1!' },
  { loginId: 'student112', password: 'Example1!' },
  { loginId: 'student113', password: 'Example1!' },
  { loginId: 'student114', password: 'Example1!' },
  { loginId: 'student115', password: 'Example1!' },
  { loginId: 'student116', password: 'Example1!' },
  { loginId: 'student117', password: 'Example1!' },
  { loginId: 'student118', password: 'Example1!' },
  { loginId: 'student119', password: 'Example1!' },
  { loginId: 'student120', password: 'Example1!' },
  { loginId: 'student121', password: 'Example1!' },
  { loginId: 'student122', password: 'Example1!' },
  { loginId: 'student123', password: 'Example1!' },
  { loginId: 'student124', password: 'Example1!' },
  { loginId: 'student125', password: 'Example1!' },
  { loginId: 'student126', password: 'Example1!' },
  { loginId: 'student127', password: 'Example1!' },
  { loginId: 'student128', password: 'Example1!' },
  { loginId: 'student129', password: 'Example1!' },
  { loginId: 'student130', password: 'Example1!' },
  { loginId: 'student131', password: 'Example1!' },
  { loginId: 'student132', password: 'Example1!' },
  { loginId: 'student133', password: 'Example1!' },
  { loginId: 'student134', password: 'Example1!' },
  { loginId: 'student135', password: 'Example1!' },
  { loginId: 'student136', password: 'Example1!' },
  { loginId: 'student137', password: 'Example1!' },
  { loginId: 'student138', password: 'Example1!' },
  { loginId: 'student139', password: 'Example1!' },
  { loginId: 'student140', password: 'Example1!' },
  { loginId: 'student141', password: 'Example1!' },
  { loginId: 'student142', password: 'Example1!' },
  { loginId: 'student143', password: 'Example1!' },
  { loginId: 'student144', password: 'Example1!' },
  { loginId: 'student145', password: 'Example1!' },
  { loginId: 'student146', password: 'Example1!' },
  { loginId: 'student147', password: 'Example1!' },
  { loginId: 'student148', password: 'Example1!' },
  { loginId: 'student149', password: 'Example1!' },
  { loginId: 'student150', password: 'Example1!' },
  { loginId: 'student151', password: 'Example1!' },
  { loginId: 'student152', password: 'Example1!' },
  { loginId: 'student153', password: 'Example1!' },
  { loginId: 'student154', password: 'Example1!' },
  { loginId: 'student155', password: 'Example1!' },
  { loginId: 'student156', password: 'Example1!' },
  { loginId: 'student157', password: 'Example1!' },
  { loginId: 'student158', password: 'Example1!' },
  { loginId: 'student159', password: 'Example1!' },
  { loginId: 'student160', password: 'Example1!' },
  { loginId: 'student161', password: 'Example1!' },
  { loginId: 'student162', password: 'Example1!' },
  { loginId: 'student163', password: 'Example1!' },
  { loginId: 'student164', password: 'Example1!' },
  { loginId: 'student165', password: 'Example1!' },
  { loginId: 'student166', password: 'Example1!' },
  { loginId: 'student167', password: 'Example1!' },
  { loginId: 'student168', password: 'Example1!' },
  { loginId: 'student169', password: 'Example1!' },
  { loginId: 'student170', password: 'Example1!' },
  { loginId: 'student171', password: 'Example1!' },
  { loginId: 'student172', password: 'Example1!' },
  { loginId: 'student173', password: 'Example1!' },
  { loginId: 'student174', password: 'Example1!' },
  { loginId: 'student175', password: 'Example1!' },
  { loginId: 'student176', password: 'Example1!' },
  { loginId: 'student177', password: 'Example1!' },
  { loginId: 'student178', password: 'Example1!' },
  { loginId: 'student179', password: 'Example1!' },
  { loginId: 'student180', password: 'Example1!' },
  { loginId: 'student181', password: 'Example1!' },
  { loginId: 'student182', password: 'Example1!' },
  { loginId: 'student183', password: 'Example1!' },
  { loginId: 'student184', password: 'Example1!' },
  { loginId: 'student185', password: 'Example1!' },
  { loginId: 'student186', password: 'Example1!' },
  { loginId: 'student187', password: 'Example1!' },
  { loginId: 'student188', password: 'Example1!' },
  { loginId: 'student189', password: 'Example1!' },
  { loginId: 'student190', password: 'Example1!' },
  { loginId: 'student191', password: 'Example1!' },
  { loginId: 'student192', password: 'Example1!' },
  { loginId: 'student193', password: 'Example1!' },
  { loginId: 'student194', password: 'Example1!' },
  { loginId: 'student195', password: 'Example1!' },
  { loginId: 'student196', password: 'Example1!' },
  { loginId: 'student197', password: 'Example1!' },
  { loginId: 'student198', password: 'Example1!' },
  { loginId: 'student199', password: 'Example1!' },
  { loginId: 'student200', password: 'Example1!' },
];

const PARENTS = [
  { loginId: 'parent1', password: 'Example1!' },
  { loginId: 'parent2', password: 'Example1!' },
  { loginId: 'parent3', password: 'Example1!' },
  { loginId: 'parent4', password: 'Example1!' },
  { loginId: 'parent5', password: 'Example1!' },
  { loginId: 'parent6', password: 'Example1!' },
  { loginId: 'parent7', password: 'Example1!' },
  { loginId: 'parent8', password: 'Example1!' },
  { loginId: 'parent9', password: 'Example1!' },
  { loginId: 'parent10', password: 'Example1!' },
  { loginId: 'parent11', password: 'Example1!' },
  { loginId: 'parent12', password: 'Example1!' },
  { loginId: 'parent13', password: 'Example1!' },
  { loginId: 'parent14', password: 'Example1!' },
  { loginId: 'parent15', password: 'Example1!' },
  { loginId: 'parent16', password: 'Example1!' },
  { loginId: 'parent17', password: 'Example1!' },
  { loginId: 'parent18', password: 'Example1!' },
  { loginId: 'parent19', password: 'Example1!' },
  { loginId: 'parent20', password: 'Example1!' },
  { loginId: 'parent21', password: 'Example1!' },
  { loginId: 'parent22', password: 'Example1!' },
  { loginId: 'parent23', password: 'Example1!' },
  { loginId: 'parent24', password: 'Example1!' },
  { loginId: 'parent25', password: 'Example1!' },
  { loginId: 'parent26', password: 'Example1!' },
  { loginId: 'parent27', password: 'Example1!' },
  { loginId: 'parent28', password: 'Example1!' },
  { loginId: 'parent29', password: 'Example1!' },
  { loginId: 'parent30', password: 'Example1!' },
  { loginId: 'parent31', password: 'Example1!' },
  { loginId: 'parent32', password: 'Example1!' },
  { loginId: 'parent33', password: 'Example1!' },
  { loginId: 'parent34', password: 'Example1!' },
  { loginId: 'parent35', password: 'Example1!' },
  { loginId: 'parent36', password: 'Example1!' },
  { loginId: 'parent37', password: 'Example1!' },
  { loginId: 'parent38', password: 'Example1!' },
  { loginId: 'parent39', password: 'Example1!' },
  { loginId: 'parent40', password: 'Example1!' },
  { loginId: 'parent41', password: 'Example1!' },
  { loginId: 'parent42', password: 'Example1!' },
  { loginId: 'parent43', password: 'Example1!' },
  { loginId: 'parent44', password: 'Example1!' },
  { loginId: 'parent45', password: 'Example1!' },
  { loginId: 'parent46', password: 'Example1!' },
  { loginId: 'parent47', password: 'Example1!' },
  { loginId: 'parent48', password: 'Example1!' },
  { loginId: 'parent49', password: 'Example1!' },
  { loginId: 'parent50', password: 'Example1!' },
  { loginId: 'parent51', password: 'Example1!' },
  { loginId: 'parent52', password: 'Example1!' },
  { loginId: 'parent53', password: 'Example1!' },
  { loginId: 'parent54', password: 'Example1!' },
  { loginId: 'parent55', password: 'Example1!' },
  { loginId: 'parent56', password: 'Example1!' },
  { loginId: 'parent57', password: 'Example1!' },
  { loginId: 'parent58', password: 'Example1!' },
  { loginId: 'parent59', password: 'Example1!' },
  { loginId: 'parent60', password: 'Example1!' },
  { loginId: 'parent61', password: 'Example1!' },
  { loginId: 'parent62', password: 'Example1!' },
  { loginId: 'parent63', password: 'Example1!' },
  { loginId: 'parent64', password: 'Example1!' },
  { loginId: 'parent65', password: 'Example1!' },
  { loginId: 'parent66', password: 'Example1!' },
  { loginId: 'parent67', password: 'Example1!' },
  { loginId: 'parent68', password: 'Example1!' },
  { loginId: 'parent69', password: 'Example1!' },
  { loginId: 'parent70', password: 'Example1!' },
  { loginId: 'parent71', password: 'Example1!' },
  { loginId: 'parent72', password: 'Example1!' },
  { loginId: 'parent73', password: 'Example1!' },
  { loginId: 'parent74', password: 'Example1!' },
  { loginId: 'parent75', password: 'Example1!' },
  { loginId: 'parent76', password: 'Example1!' },
  { loginId: 'parent77', password: 'Example1!' },
  { loginId: 'parent78', password: 'Example1!' },
  { loginId: 'parent79', password: 'Example1!' },
  { loginId: 'parent80', password: 'Example1!' },
  { loginId: 'parent81', password: 'Example1!' },
  { loginId: 'parent82', password: 'Example1!' },
  { loginId: 'parent83', password: 'Example1!' },
  { loginId: 'parent84', password: 'Example1!' },
  { loginId: 'parent85', password: 'Example1!' },
  { loginId: 'parent86', password: 'Example1!' },
  { loginId: 'parent87', password: 'Example1!' },
  { loginId: 'parent88', password: 'Example1!' },
  { loginId: 'parent89', password: 'Example1!' },
  { loginId: 'parent90', password: 'Example1!' },
  { loginId: 'parent91', password: 'Example1!' },
  { loginId: 'parent92', password: 'Example1!' },
  { loginId: 'parent93', password: 'Example1!' },
  { loginId: 'parent94', password: 'Example1!' },
  { loginId: 'parent95', password: 'Example1!' },
  { loginId: 'parent96', password: 'Example1!' },
  { loginId: 'parent97', password: 'Example1!' },
  { loginId: 'parent98', password: 'Example1!' },
  { loginId: 'parent99', password: 'Example1!' },
  { loginId: 'parent100', password: 'Example1!' },
];

// ─────────────────────────────────────────────
// 시나리오 / 임계값 설정
// ─────────────────────────────────────────────
export const options = {
  scenarios: {
    student_scenario: {
      executor: 'ramping-vus',
      exec: 'studentScenario',
      startVUs: 0,
      stages: [
        { duration: '90s', target: 200 }, // 1단계: 200명까지 증가
        { duration: '3m', target: 200 }, // 2단계: 3분 유지
        { duration: '30s', target: 0 }, // 3단계: 종료
      ],
      gracefulRampDown: '120s',
    },
    parent_scenario: {
      executor: 'ramping-vus',
      exec: 'parentScenario',
      startTime: '90s',
      startVUs: 0,
      stages: [
        { duration: '90s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '120s',
    },
  },
  thresholds: {
    // ── type 기준 ──────────────────────────────────
    'http_req_duration{type:normal}': ['p(95)<2000', 'p(99)<3000'],
    'http_req_duration{type:heavy}': ['p(95)<2000', 'p(99)<4000'],
    http_req_failed: ['rate<0.01'],

    // ── API별 (normal) ────────────────────────────
    'http_req_duration{name:login}': ['p(95)<2000', 'p(99)<3000'],
    'http_req_duration{name:GET /students/me/classes}': [
      'p(95)<2000',
      'p(99)<3000',
    ],
    'http_req_duration{name:GET /classes/:classId/notices}': [
      'p(95)<2000',
      'p(99)<3000',
    ],
    'http_req_duration{name:GET /classes/:classId/notices/:noticeId}': [
      'p(95)<2000',
      'p(99)<3000',
    ],
    'http_req_duration{name:GET /class/:classId/textbooks}': [
      'p(95)<2000',
      'p(99)<3000',
    ],
    'http_req_duration{name:GET /students/materials}': [
      'p(95)<2000',
      'p(99)<3000',
    ],
    'http_req_duration{name:GET /parents/me/students}': [
      'p(95)<2000',
      'p(99)<3000',
    ],
    'http_req_duration{name:GET /parents/me/students/:studentId/classes}': [
      'p(95)<2000',
      'p(99)<3000',
    ],

    // ── API별 (heavy) ─────────────────────────────
    'http_req_duration{name:GET /students/me/classes/:classId/textbooks/:textbookId/homework}':
      ['p(95)<2000', 'p(99)<4000'],
    'http_req_duration{name:GET /classes/:classId/exams/grades/me}': [
      'p(95)<2000',
      'p(99)<4000',
    ],
    'http_req_duration{name:GET /classes/:classId/exams/:examId/rank/me}': [
      'p(95)<2000',
      'p(99)<4000',
    ],
    'http_req_duration{name:GET /parents/me/students/:studentId/classes/:classId/textbooks/:textbookId/homework}':
      ['p(95)<2000', 'p(99)<4000'],
    'http_req_duration{name:GET /classes/:classId/exams/grades/my-students/:studentId}':
      ['p(95)<2000', 'p(99)<4000'],
    'http_req_duration{name:GET /classes/:classId/exams/:examId/rank/my-student/:studentId}':
      ['p(95)<2000', 'p(99)<4000'],
  },
};

// ─────────────────────────────────────────────
// 공통 유틸
// ─────────────────────────────────────────────
const JSON_HEADERS = { 'Content-Type': 'application/json' };

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 응답 body에서 data 필드를 파싱해 반환.
 * 파싱 실패 시 null 반환.
 */
function parseData(res) {
  try {
    const body = res.json();
    return body?.data ?? null;
  } catch (_) {
    return null;
  }
}

function login(credentials) {
  const res = http.post(
    `${BASE_URL}/auth/sign-in`,
    JSON.stringify({
      loginId: credentials.loginId,
      password: credentials.password,
    }),
    { headers: JSON_HEADERS, tags: { type: 'normal', name: 'login' } },
  );
  const success = check(res, { '[login] status 201': (r) => r.status === 201 });
  if (success) {
    savedCookies.Authentication = res.cookies['Authentication']?.[0]?.value ?? null;
    savedCookies.Refresh = res.cookies['Refresh']?.[0]?.value ?? null;
  }
  return success;
}

function injectCookies() {
  const jar = http.cookieJar();
  if (savedCookies.Authentication) {
    jar.set(BASE_URL, 'Authentication', savedCookies.Authentication);
  }
  if (savedCookies.Refresh) {
    jar.set(BASE_URL, 'Refresh', savedCookies.Refresh);
  }
}

// ─────────────────────────────────────────────
// VU별 로그인 상태 (iteration 간 유지)
// ─────────────────────────────────────────────
let loggedIn = false;
const savedCookies = { Authentication: null, Refresh: null };

// ─────────────────────────────────────────────
// 학생 시나리오
// ─────────────────────────────────────────────
export function studentScenario() {
  const creds = STUDENTS[(__VU - 1) % STUDENTS.length];

  if (!loggedIn) {
    loggedIn = login(creds);
    sleep(2);
    if (!loggedIn) return;
  } else {
    injectCookies();
  }

  // 1. 내 클래스 전체 목록 조회 → 랜덤 선택
  const classesRes = http.get(`${BASE_URL}/students/me/classes`, {
    tags: { type: 'normal', name: 'GET /students/me/classes' },
  });
  check(classesRes, { '[student] classes 200': (r) => r.status === 200 });
  sleep(2);

  const classes = parseData(classesRes);
  if (!classes || classes.length === 0) return;
  const classId = randomItem(classes).classId;

  // 2. 해당 클래스 공지사항 전체 조회 → 50% 확률로 공지사항 상세 조회
  const noticesRes = http.get(`${BASE_URL}/classes/${classId}/notices`, {
    tags: { type: 'normal', name: 'GET /classes/:classId/notices' },
  });
  check(noticesRes, { '[student] notices 200': (r) => r.status === 200 });
  sleep(5);

  if (Math.random() < 0.5) {
    // nestjs-typeorm-paginate → data.items
    const noticesData = parseData(noticesRes);
    const noticeItems = noticesData?.items ?? noticesData;
    if (Array.isArray(noticeItems) && noticeItems.length > 0) {
      const noticeId = randomItem(noticeItems).noticeId;
      const detailRes = http.get(
        `${BASE_URL}/classes/${classId}/notices/${noticeId}`,
        {
          tags: {
            type: 'normal',
            name: 'GET /classes/:classId/notices/:noticeId',
          },
        },
      );
      check(detailRes, {
        '[student] notice detail 200': (r) => r.status === 200,
      });
      sleep(10);
    }
  }

  // 3. 교재 목록 조회
  const textbooksRes = http.get(`${BASE_URL}/class/${classId}/textbooks`, {
    tags: { type: 'normal', name: 'GET /class/:classId/textbooks' },
  });
  check(textbooksRes, { '[student] textbooks 200': (r) => r.status === 200 });
  sleep(5);

  // 4. 학생 본인의 숙제 진도 목록 조회 (textbookId 필요)
  const textbooks = parseData(textbooksRes);
  if (Array.isArray(textbooks) && textbooks.length > 0) {
    // 응답 형태: [{ classTextbookId, classId, textbook: { textbookId, name, grade } }]
    const textbookId = randomItem(textbooks).textbook?.textbookId;
    if (textbookId) {
      const hwRes = http.get(
        `${BASE_URL}/students/me/classes/${classId}/textbooks/${textbookId}/homework`,
        {
          tags: {
            type: 'heavy',
            name: 'GET /students/me/classes/:classId/textbooks/:textbookId/homework',
          },
        },
      );
      check(hwRes, { '[student] homework 200': (r) => r.status === 200 });
      sleep(10);
    }
  }

  // 5. 학습자료 목록 조회
  const materialsRes = http.get(
    `${BASE_URL}/students/materials?classId=${classId}`,
    {
      tags: { type: 'normal', name: 'GET /students/materials' },
    },
  );
  check(materialsRes, { '[student] materials 200': (r) => r.status === 200 });
  sleep(5);

  // 6. 학생 본인 시험점수 전체 조회
  const gradesRes = http.get(`${BASE_URL}/classes/${classId}/exams/grades/me`, {
    tags: { type: 'heavy', name: 'GET /classes/:classId/exams/grades/me' },
  });
  check(gradesRes, { '[student] grades 200': (r) => r.status === 200 });
  sleep(10);

  // 7. 학생 본인 시험 등수 조회 → 10초 후 클래스 목록으로 돌아감
  const grades = parseData(gradesRes);
  if (Array.isArray(grades) && grades.length > 0) {
    const examId = randomItem(grades).examId;
    if (examId) {
      const rankRes = http.get(
        `${BASE_URL}/classes/${classId}/exams/${examId}/rank/me`,
        {
          tags: {
            type: 'heavy',
            name: 'GET /classes/:classId/exams/:examId/rank/me',
          },
        },
      );
      check(rankRes, { '[student] rank 200': (r) => r.status === 200 });
      sleep(10);
    }
  }
}

// ─────────────────────────────────────────────
// 학부모 시나리오
// ─────────────────────────────────────────────
export function parentScenario() {
  const creds = PARENTS[(__VU - 1) % PARENTS.length];

  if (!loggedIn) {
    loggedIn = login(creds);
    sleep(2);
    if (!loggedIn) return;
  } else {
    injectCookies();
  }

  // 1. 자녀 조회 → 랜덤 선택
  const childrenRes = http.get(`${BASE_URL}/parents/me/students`, {
    tags: { type: 'normal', name: 'GET /parents/me/students' },
  });
  check(childrenRes, { '[parent] children 200': (r) => r.status === 200 });
  sleep(2);

  const children = parseData(childrenRes);
  if (!children || children.length === 0) return;
  const studentId = randomItem(children).studentId;

  // 2. 내 클래스 전체 목록 조회 (자녀 기준) → 랜덤 선택
  const classesRes = http.get(
    `${BASE_URL}/parents/me/students/${studentId}/classes`,
    {
      tags: {
        type: 'normal',
        name: 'GET /parents/me/students/:studentId/classes',
      },
    },
  );
  check(classesRes, { '[parent] classes 200': (r) => r.status === 200 });
  sleep(2);

  const classes = parseData(classesRes);
  if (!classes || classes.length === 0) return;
  const classId = randomItem(classes).classId;

  // 3. 해당 클래스 공지사항 전체 조회 → 50% 확률로 공지사항 상세 조회
  const noticesRes = http.get(`${BASE_URL}/classes/${classId}/notices`, {
    tags: { type: 'normal', name: 'GET /classes/:classId/notices' },
  });
  check(noticesRes, { '[parent] notices 200': (r) => r.status === 200 });
  sleep(5);

  if (Math.random() < 0.5) {
    const noticesData = parseData(noticesRes);
    const noticeItems = noticesData?.items ?? noticesData;
    if (Array.isArray(noticeItems) && noticeItems.length > 0) {
      const noticeId = randomItem(noticeItems).noticeId;
      const detailRes = http.get(
        `${BASE_URL}/classes/${classId}/notices/${noticeId}`,
        {
          tags: {
            type: 'normal',
            name: 'GET /classes/:classId/notices/:noticeId',
          },
        },
      );
      check(detailRes, {
        '[parent] notice detail 200': (r) => r.status === 200,
      });
      sleep(10);
    }
  }

  // 4. 학생(자녀) 본인의 숙제 진도 목록 조회 (textbookId 필요)
  const textbooksRes = http.get(`${BASE_URL}/class/${classId}/textbooks`, {
    tags: { type: 'normal', name: 'GET /class/:classId/textbooks' },
  });
  check(textbooksRes, { '[parent] textbooks 200': (r) => r.status === 200 });
  sleep(5);

  const textbooks = parseData(textbooksRes);
  if (Array.isArray(textbooks) && textbooks.length > 0) {
    const textbookId = randomItem(textbooks).textbook?.textbookId;
    if (textbookId) {
      const hwRes = http.get(
        `${BASE_URL}/parents/me/students/${studentId}/classes/${classId}/textbooks/${textbookId}/homework`,
        {
          tags: {
            type: 'heavy',
            name: 'GET /parents/me/students/:studentId/classes/:classId/textbooks/:textbookId/homework',
          },
        },
      );
      check(hwRes, { '[parent] homework 200': (r) => r.status === 200 });
      sleep(10);
    }
  }

  // 5. 학생 본인 시험점수 전체 조회
  const gradesRes = http.get(
    `${BASE_URL}/classes/${classId}/exams/grades/my-students/${studentId}`,
    {
      tags: {
        type: 'heavy',
        name: 'GET /classes/:classId/exams/grades/my-students/:studentId',
      },
    },
  );
  check(gradesRes, { '[parent] grades 200': (r) => r.status === 200 });
  sleep(10);

  // 6. 학생 본인 시험 등수 조회 → 10초 후 자녀 조회로 돌아감
  const grades = parseData(gradesRes);
  if (Array.isArray(grades) && grades.length > 0) {
    const examId = randomItem(grades).examId;
    if (examId) {
      const rankRes = http.get(
        `${BASE_URL}/classes/${classId}/exams/${examId}/rank/my-student/${studentId}`,
        {
          tags: {
            type: 'heavy',
            name: 'GET /classes/:classId/exams/:examId/rank/my-student/:studentId',
          },
        },
      );
      check(rankRes, { '[parent] rank 200': (r) => r.status === 200 });
      sleep(10);
    }
  }
}
