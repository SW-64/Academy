/**
 * 버전 기반 캐시 무효화 가이드
 *
 * 1. 조회 시:
 *    - ver 키에서 현재 버전 조회
 *    - 없으면 ver=1 설정 (초기값)
 *    - {resource}:list:...:v:{ver} 조회
 *
 * 2. 무효화 시:
 *    - ver 키 값만 +1 증가
 *    - 기존 캐시는 TTL로 자연 만료
 *
 * 3. TTL 권장:
 *    - ver 키: 1일
 *    - list 키: 10분
 */
/** 고정 키 값들만 허용하는 타입 */
export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];
/** 동적 캐시 키 생성 함수들의 반환 타입 */
export type DynamicCacheKey = ReturnType<
  (typeof cacheKey)[keyof typeof cacheKey]
>;
/** 모든 캐시 키 타입 (고정 + 동적) */
export type AnyCacheKey = CacheKey | DynamicCacheKey;

/** 1) 고정 키: 완성 문자열로 끝나는 것들만 */
export const CACHE_KEYS = {
  // ===== 관리자: 클래스  목록 =====
  ADMIN_CLASSES_LIST: 'admin:classes:list',
  // ===== 관리자: 학생 목록 =====
  ADMIN_STUDENTS_LIST_PAGE_1: 'admin:students:list:page:1',
  // ===== 관리자: 학부모 목록 =====
  ADMIN_PARENTS_LIST_PAGE_1: 'admin:parents:list:page:1',
} as const;

/** 2) 동적 키: classId / userId / month / ver 등이 들어가는 것들 */
export const cacheKey = {
  // ===== 관리자: 클래스 내 학생 목록 =====
  adminClassStudentsList: (classId: number) =>
    `admin:classes:${classId}:students:list`,

  // ===== 관리자: 시험(버전 + 월별 목록) =====
  adminClassExamsVer: (classId: number) => `admin:classes:${classId}:exams:ver`,
  adminClassExamsListByMonth: (classId: number, yyyymm: string, ver: number) =>
    `admin:classes:${classId}:exams:list:month:${yyyymm}:v:${ver}`,

  // ===== 관리자: 학습자료(버전 + 목록 page=1) =====
  adminClassMaterialsVer: (classId: number) =>
    `admin:classes:${classId}:materials:ver`,
  adminClassMaterialsListPage1: (classId: number, ver: number) =>
    `admin:classes:${classId}:materials:list:page:1:v:${ver}`,

  // ===== 관리자: 공지사항(버전 + 목록 page=1) =====
  adminClassNoticesVer: (classId: number) =>
    `admin:classes:${classId}:notices:ver`,
  adminClassNoticesListPage1: (classId: number, ver: number) =>
    `admin:classes:${classId}:notices:list:page:1:v:${ver}`,

  // ===== 학생: 내 클래스 목록 =====
  studentUserClassesList: (userId: number) =>
    `student:user:${userId}:classes:list`,

  // ===== 학생: 공지사항(버전 + 목록) =====
  studentClassNoticesVer: (classId: number) =>
    `student:classes:${classId}:notices:ver`,
  studentClassNoticesListPage1: (classId: number, ver: number) =>
    `student:classes:${classId}:notices:list:page:1:v:${ver}`,

  // ===== 학생: 학습자료(버전 + 목록) =====
  studentClassMaterialsVer: (classId: number) =>
    `student:classes:${classId}:materials:ver`,
  studentClassMaterialsListPage1: (classId: number, ver: number) =>
    `student:classes:${classId}:materials:list:page:1:v:${ver}`,

  // ===== 학부모: 공지사항(버전 + 목록) =====
  parentClassNoticesVer: (classId: number) =>
    `parent:classes:${classId}:notices:ver`,
  parentClassNoticesListPage1: (classId: number, ver: number) =>
    `parent:classes:${classId}:notices:list:page:1:v:${ver}`,

} as const;
