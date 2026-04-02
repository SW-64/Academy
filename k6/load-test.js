import http from 'k6/http';
import { sleep, check } from 'k6';

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────
const BASE_URL = 'http://localhost:3000/api/v1';

const STUDENTS = [
  { loginId: 'student01', password: 'Test1234!' },
  { loginId: 'student02', password: 'Test1234!' },
  { loginId: 'student03', password: 'Test1234!' },
  { loginId: 'student04', password: 'Test1234!' },
  { loginId: 'student05', password: 'Test1234!' },
  { loginId: 'student06', password: 'Test1234!' },
  { loginId: 'student07', password: 'Test1234!' },
  { loginId: 'student08', password: 'Test1234!' },
  { loginId: 'student09', password: 'Test1234!' },
  { loginId: 'student10', password: 'Test1234!' },
];

const PARENTS = [
  { loginId: 'parent01', password: 'Test1234!' },
  { loginId: 'parent02', password: 'Test1234!' },
  { loginId: 'parent03', password: 'Test1234!' },
  { loginId: 'parent04', password: 'Test1234!' },
  { loginId: 'parent05', password: 'Test1234!' },
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
        { duration: '90s', target: 70 }, // 1단계: 70명까지 증가
        { duration: '3m', target: 70 },  // 2단계: 3분 유지
        { duration: '30s', target: 0 },  // 3단계: 종료
      ],
      gracefulRampDown: '15s',
    },
    parent_scenario: {
      executor: 'ramping-vus',
      exec: 'parentScenario',
      startVUs: 0,
      stages: [
        { duration: '90s', target: 30 },
        { duration: '3m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
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
    JSON.stringify({ loginId: credentials.loginId, password: credentials.password }),
    { headers: JSON_HEADERS },
  );
  check(res, { '[login] status 200': (r) => r.status === 200 });
  return res;
}

function logout() {
  const res = http.post(`${BASE_URL}/auth/sign-out`, null, { headers: JSON_HEADERS });
  check(res, { '[logout] status 200': (r) => r.status === 200 });
}

// ─────────────────────────────────────────────
// 학생 시나리오
// ─────────────────────────────────────────────
export function studentScenario() {
  // 계정 순환 (__VU는 1-based)
  const creds = STUDENTS[(__VU - 1) % STUDENTS.length];

  // 1. 로그인
  login(creds);
  sleep(2);

  // 2. 내 클래스 전체 목록 조회 → 랜덤 선택
  const classesRes = http.get(`${BASE_URL}/students/me/classes`);
  check(classesRes, { '[student] classes 200': (r) => r.status === 200 });
  sleep(5);

  const classes = parseData(classesRes);
  if (!classes || classes.length === 0) {
    logout();
    return;
  }
  const classId = randomItem(classes).classId;

  // 3. 해당 클래스 공지사항 전체 조회 → 50% 확률로 공지사항 상세 조회
  const noticesRes = http.get(`${BASE_URL}/classes/${classId}/notices`);
  check(noticesRes, { '[student] notices 200': (r) => r.status === 200 });
  sleep(5);

  if (Math.random() < 0.5) {
    // nestjs-typeorm-paginate → data.items
    const noticesData = parseData(noticesRes);
    const noticeItems = noticesData?.items ?? noticesData;
    if (Array.isArray(noticeItems) && noticeItems.length > 0) {
      const noticeId = randomItem(noticeItems).noticeId;
      const detailRes = http.get(`${BASE_URL}/classes/${classId}/notices/${noticeId}`);
      check(detailRes, { '[student] notice detail 200': (r) => r.status === 200 });
      sleep(10);
    }
  }

  // 4. 교재 목록 조회
  const textbooksRes = http.get(`${BASE_URL}/class/${classId}/textbooks`);
  check(textbooksRes, { '[student] textbooks 200': (r) => r.status === 200 });
  sleep(5);

  // 5. 학생 본인의 숙제 진도 목록 조회 (textbookId 필요)
  const textbooks = parseData(textbooksRes);
  if (Array.isArray(textbooks) && textbooks.length > 0) {
    // 응답 형태: [{ classTextbookId, classId, textbook: { textbookId, name, grade } }]
    const textbookId = randomItem(textbooks).textbook?.textbookId;
    if (textbookId) {
      const hwRes = http.get(
        `${BASE_URL}/students/me/classes/${classId}/textbooks/${textbookId}/homework`,
      );
      check(hwRes, { '[student] homework 200': (r) => r.status === 200 });
      sleep(5);
    }
  }

  // 6. 학습자료 목록 조회 → 50% 확률로 학습자료 상세 조회
  const materialsRes = http.get(`${BASE_URL}/materials?classId=${classId}`);
  check(materialsRes, { '[student] materials 200': (r) => r.status === 200 });
  sleep(5);

  if (Math.random() < 0.5) {
    const materials = parseData(materialsRes);
    if (Array.isArray(materials) && materials.length > 0) {
      const materialId = randomItem(materials).materialId;
      const detailRes = http.get(`${BASE_URL}/materials/${materialId}`);
      check(detailRes, { '[student] material detail 200': (r) => r.status === 200 });
      sleep(10);
    }
  }

  // 7. 학생 본인 시험점수 전체 조회
  const gradesRes = http.get(`${BASE_URL}/classes/${classId}/exams/grades/me`);
  check(gradesRes, { '[student] grades 200': (r) => r.status === 200 });
  sleep(8);

  // 8. 학생 본인 시험 등수 조회 (grades 응답에서 examId 추출)
  const grades = parseData(gradesRes);
  if (Array.isArray(grades) && grades.length > 0) {
    const examId = randomItem(grades).examId;
    if (examId) {
      const rankRes = http.get(
        `${BASE_URL}/classes/${classId}/exams/${examId}/rank/me`,
      );
      check(rankRes, { '[student] rank 200': (r) => r.status === 200 });
      sleep(8);
    }
  }

  // 9. 로그아웃
  logout();
}

// ─────────────────────────────────────────────
// 학부모 시나리오
// ─────────────────────────────────────────────
export function parentScenario() {
  const creds = PARENTS[(__VU - 1) % PARENTS.length];

  // 1. 로그인
  login(creds);
  sleep(2);

  // 2. 자녀 조회 → 랜덤 선택
  const childrenRes = http.get(`${BASE_URL}/parents/me/students`);
  check(childrenRes, { '[parent] children 200': (r) => r.status === 200 });
  sleep(5);

  const children = parseData(childrenRes);
  if (!children || children.length === 0) {
    logout();
    return;
  }
  const studentId = randomItem(children).studentId;

  // 3. 내 클래스 전체 목록 조회 (자녀 기준) → 랜덤 선택
  const classesRes = http.get(`${BASE_URL}/parents/me/students/${studentId}/classes`);
  check(classesRes, { '[parent] classes 200': (r) => r.status === 200 });
  sleep(5);

  const classes = parseData(classesRes);
  if (!classes || classes.length === 0) {
    logout();
    return;
  }
  const classId = randomItem(classes).classId;

  // 4. 해당 클래스 공지사항 전체 조회 → 50% 확률로 공지사항 상세 조회
  const noticesRes = http.get(`${BASE_URL}/classes/${classId}/notices`);
  check(noticesRes, { '[parent] notices 200': (r) => r.status === 200 });
  sleep(5);

  if (Math.random() < 0.5) {
    const noticesData = parseData(noticesRes);
    const noticeItems = noticesData?.items ?? noticesData;
    if (Array.isArray(noticeItems) && noticeItems.length > 0) {
      const noticeId = randomItem(noticeItems).noticeId;
      const detailRes = http.get(`${BASE_URL}/classes/${classId}/notices/${noticeId}`);
      check(detailRes, { '[parent] notice detail 200': (r) => r.status === 200 });
      sleep(10);
    }
  }

  // 5. 학생(자녀) 본인의 숙제 진도 목록 조회 (textbookId 필요)
  const textbooksRes = http.get(`${BASE_URL}/class/${classId}/textbooks`);
  check(textbooksRes, { '[parent] textbooks 200': (r) => r.status === 200 });

  const textbooks = parseData(textbooksRes);
  if (Array.isArray(textbooks) && textbooks.length > 0) {
    const textbookId = randomItem(textbooks).textbook?.textbookId;
    if (textbookId) {
      const hwRes = http.get(
        `${BASE_URL}/parents/me/students/${studentId}/classes/${classId}/textbooks/${textbookId}/homework`,
      );
      check(hwRes, { '[parent] homework 200': (r) => r.status === 200 });
      sleep(5);
    }
  }

  // 6. 학생 본인 시험점수 전체 조회
  const gradesRes = http.get(
    `${BASE_URL}/classes/${classId}/exams/grades/my-students/${studentId}`,
  );
  check(gradesRes, { '[parent] grades 200': (r) => r.status === 200 });
  sleep(8);

  // 7. 학생 본인 시험 등수 조회
  const grades = parseData(gradesRes);
  if (Array.isArray(grades) && grades.length > 0) {
    const examId = randomItem(grades).examId;
    if (examId) {
      const rankRes = http.get(
        `${BASE_URL}/classes/${classId}/exams/${examId}/rank/my-student/${studentId}`,
      );
      check(rankRes, { '[parent] rank 200': (r) => r.status === 200 });
      sleep(8);
    }
  }

  // 8. 로그아웃
  logout();
}
