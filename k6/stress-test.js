import http from 'k6/http';
import { sleep, check } from 'k6';

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────
const BASE_URL = 'https://api.kwakmath.co.kr/api/v1';

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
        { duration: '90s', target: 100 }, // 1단계: 100명까지 증가
        { duration: '2m', target: 100 },  // 2단계: 2분 유지
        { duration: '90s', target: 150 }, // 3단계: 150명까지 증가
        { duration: '2m', target: 150 },  // 4단계: 2분 유지
        { duration: '90s', target: 200 }, // 5단계: 200명까지 증가
        { duration: '2m', target: 200 },  // 6단계: 2분 유지
        { duration: '30s', target: 0 },   // 7단계: 종료
      ],
      gracefulRampDown: '15s',
    },
    parent_scenario: {
      executor: 'ramping-vus',
      exec: 'parentScenario',
      startVUs: 0,
      stages: [
        { duration: '90s', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '90s', target: 75 },
        { duration: '2m', target: 75 },
        { duration: '90s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    'http_req_duration{type:normal}': ['p(95)<2000', 'p(99)<3000'],
    'http_req_duration{type:heavy}': ['p(95)<2000', 'p(99)<4000'],
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
    JSON.stringify({
      loginId: credentials.loginId,
      password: credentials.password,
    }),
    { headers: JSON_HEADERS, tags: { type: 'normal' } },
  );
  const success = check(res, { '[login] status 200': (r) => r.status === 200 });
  return success;
}

function logout() {
  const res = http.post(`${BASE_URL}/auth/sign-out`, null, {
    headers: JSON_HEADERS,
    tags: { type: 'normal' },
  });
  check(res, { '[logout] status 200': (r) => r.status === 200 });
}

// ─────────────────────────────────────────────
// 학생 시나리오
// ─────────────────────────────────────────────
export function studentScenario() {
  // 계정 순환 (__VU는 1-based)
  const creds = STUDENTS[(__VU - 1) % STUDENTS.length];

  // 1. 로그인
  const loginOk = login(creds);
  sleep(2);
  if (!loginOk) return;

  // 2. 내 클래스 전체 목록 조회 → 랜덤 선택
  const classesRes = http.get(`${BASE_URL}/students/me/classes`, { tags: { type: 'normal' } });
  check(classesRes, { '[student] classes 200': (r) => r.status === 200 });
  sleep(2);

  const classes = parseData(classesRes);
  if (!classes || classes.length === 0) {
    logout();
    return;
  }
  const classId = randomItem(classes).classId;

  // 3. 해당 클래스 공지사항 전체 조회 → 50% 확률로 공지사항 상세 조회
  const noticesRes = http.get(`${BASE_URL}/classes/${classId}/notices`, { tags: { type: 'normal' } });
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
        { tags: { type: 'normal' } },
      );
      check(detailRes, {
        '[student] notice detail 200': (r) => r.status === 200,
      });
      sleep(10);
    }
  }

  // 4. 교재 목록 조회
  const textbooksRes = http.get(`${BASE_URL}/class/${classId}/textbooks`, { tags: { type: 'normal' } });
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
        { tags: { type: 'heavy' } },
      );
      check(hwRes, { '[student] homework 200': (r) => r.status === 200 });
      sleep(10);
    }
  }

  // 6. 학습자료 목록 조회 → 50% 확률로 학습자료 상세 조회
  const materialsRes = http.get(`${BASE_URL}/materials?classId=${classId}`, { tags: { type: 'normal' } });
  check(materialsRes, { '[student] materials 200': (r) => r.status === 200 });
  sleep(5);

  if (Math.random() < 0.5) {
    const materials = parseData(materialsRes);
    if (Array.isArray(materials) && materials.length > 0) {
      const materialId = randomItem(materials).materialId;
      const detailRes = http.get(`${BASE_URL}/materials/${materialId}`, { tags: { type: 'normal' } });
      check(detailRes, {
        '[student] material detail 200': (r) => r.status === 200,
      });
      sleep(10);
    }
  }

  // 7. 학생 본인 시험점수 전체 조회
  const gradesRes = http.get(`${BASE_URL}/classes/${classId}/exams/grades/me`, { tags: { type: 'heavy' } });
  check(gradesRes, { '[student] grades 200': (r) => r.status === 200 });
  sleep(10);

  // 8. 학생 본인 시험 등수 조회 (grades 응답에서 examId 추출)
  const grades = parseData(gradesRes);
  if (Array.isArray(grades) && grades.length > 0) {
    const examId = randomItem(grades).examId;
    if (examId) {
      const rankRes = http.get(
        `${BASE_URL}/classes/${classId}/exams/${examId}/rank/me`,
        { tags: { type: 'heavy' } },
      );
      check(rankRes, { '[student] rank 200': (r) => r.status === 200 });
      sleep(10);
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
  const loginOk = login(creds);
  sleep(2);
  if (!loginOk) return;

  // 2. 자녀 조회 → 랜덤 선택
  const childrenRes = http.get(`${BASE_URL}/parents/me/students`, { tags: { type: 'normal' } });
  check(childrenRes, { '[parent] children 200': (r) => r.status === 200 });
  sleep(2);

  const children = parseData(childrenRes);
  if (!children || children.length === 0) {
    logout();
    return;
  }
  const studentId = randomItem(children).studentId;

  // 3. 내 클래스 전체 목록 조회 (자녀 기준) → 랜덤 선택
  const classesRes = http.get(
    `${BASE_URL}/parents/me/students/${studentId}/classes`,
    { tags: { type: 'normal' } },
  );
  check(classesRes, { '[parent] classes 200': (r) => r.status === 200 });
  sleep(2);

  const classes = parseData(classesRes);
  if (!classes || classes.length === 0) {
    logout();
    return;
  }
  const classId = randomItem(classes).classId;

  // 4. 해당 클래스 공지사항 전체 조회 → 50% 확률로 공지사항 상세 조회
  const noticesRes = http.get(`${BASE_URL}/classes/${classId}/notices`, { tags: { type: 'normal' } });
  check(noticesRes, { '[parent] notices 200': (r) => r.status === 200 });
  sleep(5);

  if (Math.random() < 0.5) {
    const noticesData = parseData(noticesRes);
    const noticeItems = noticesData?.items ?? noticesData;
    if (Array.isArray(noticeItems) && noticeItems.length > 0) {
      const noticeId = randomItem(noticeItems).noticeId;
      const detailRes = http.get(
        `${BASE_URL}/classes/${classId}/notices/${noticeId}`,
        { tags: { type: 'normal' } },
      );
      check(detailRes, {
        '[parent] notice detail 200': (r) => r.status === 200,
      });
      sleep(10);
    }
  }

  // 5. 학생(자녀) 본인의 숙제 진도 목록 조회 (textbookId 필요)
  const textbooksRes = http.get(`${BASE_URL}/class/${classId}/textbooks`, { tags: { type: 'normal' } });
  check(textbooksRes, { '[parent] textbooks 200': (r) => r.status === 200 });
  sleep(5);

  const textbooks = parseData(textbooksRes);
  if (Array.isArray(textbooks) && textbooks.length > 0) {
    const textbookId = randomItem(textbooks).textbook?.textbookId;
    if (textbookId) {
      const hwRes = http.get(
        `${BASE_URL}/parents/me/students/${studentId}/classes/${classId}/textbooks/${textbookId}/homework`,
        { tags: { type: 'heavy' } },
      );
      check(hwRes, { '[parent] homework 200': (r) => r.status === 200 });
      sleep(10);
    }
  }

  // 6. 학생 본인 시험점수 전체 조회
  const gradesRes = http.get(
    `${BASE_URL}/classes/${classId}/exams/grades/my-students/${studentId}`,
    { tags: { type: 'heavy' } },
  );
  check(gradesRes, { '[parent] grades 200': (r) => r.status === 200 });
  sleep(10);

  // 7. 학생 본인 시험 등수 조회
  const grades = parseData(gradesRes);
  if (Array.isArray(grades) && grades.length > 0) {
    const examId = randomItem(grades).examId;
    if (examId) {
      const rankRes = http.get(
        `${BASE_URL}/classes/${classId}/exams/${examId}/rank/my-student/${studentId}`,
        { tags: { type: 'heavy' } },
      );
      check(rankRes, { '[parent] rank 200': (r) => r.status === 200 });
      sleep(10);
    }
  }

  // 8. 로그아웃
  logout();
}
