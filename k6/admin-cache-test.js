import http from 'k6/http';
import { sleep, check } from 'k6';

const BASE_URL = 'https://api.kwakmath.co.kr';
const CLASS_ID = 1; 

export let options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    'http_req_duration{api:class_list}': ['p(95)<500'],
    'http_req_duration{api:class_students}': ['p(95)<500'],
    'http_req_duration{api:student_list}': ['p(95)<500'],
    'http_req_duration{api:parent_list}': ['p(95)<500'],
    'http_req_duration{api:exam_list}': ['p(95)<500'],
    'http_req_duration{api:notice_list}': ['p(95)<500'],
    'http_req_duration{api:material_list}': ['p(95)<500'],
  },
};
const ADMIN_ID = 'admin';
const ADMIN_PW = 'Example1!';
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/sign-in`,
    JSON.stringify({ loginId: ADMIN_ID, password: ADMIN_PW }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  // 쿠키에서 토큰 추출
  const cookies = res.cookies;
  console.log('쿠키:', JSON.stringify(cookies)); // 구조 확인용
  const token = cookies['Authentication'][0].value;

  if (!token) throw new Error('토큰 발급 실패');
  return { token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `Authentication=${data.token}`, 
  };
  const r1 = http.get(`${BASE_URL}/api/v1/class`, { headers, tags: { api: 'class_list' } });
  sleep(0.1);

  const r2 = http.get(`${BASE_URL}/api/v1/class/${CLASS_ID}/students`, { headers, tags: { api: 'class_students' } });
  sleep(0.1);

  const r3 = http.get(`${BASE_URL}/api/v1/students?page=1`, { headers, tags: { api: 'student_list' } });
  sleep(0.1);

  const r4 = http.get(`${BASE_URL}/api/v1/parents?page=1`, { headers, tags: { api: 'parent_list' } });
  sleep(0.1);

  const r5 = http.get(`${BASE_URL}/api/v1/classes/${CLASS_ID}/exams?year=2026&month=1`, { headers, tags: { api: 'exam_list' } });
  sleep(0.1);

  const r6 = http.get(`${BASE_URL}/api/v1/classes/${CLASS_ID}/notices`, { headers, tags: { api: 'notice_list' } });
  sleep(0.1);

  const r7 = http.get(`${BASE_URL}/api/v1/materials?classId=1`, { headers, tags: { api: 'material_list' } });
  sleep(1);
}