# Academy Management System

학원 선생님이 학생과 학부모를 편리하게 관리할 수 있도록 설계된 NestJS 기반 백엔드 서비스입니다.

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [API 명세](#4-api-명세)
5. [인증 플로우](#5-인증-플로우)
6. [Redis 캐싱 전략](#6-redis-캐싱-전략)
7. [성능 테스트](#7-성능-테스트)
8. [폴더 구조](#8-폴더-구조)
9. [모니터링](#9-모니터링)

---

## 1. 프로젝트 소개

### 서비스 개요

학원 운영에 필요한 학생 관리, 수업 배정, 시험 성적, 숙제 진도, 공지사항, 학습자료 등을 하나의 플랫폼에서 처리합니다.
<br/>
선생님(Admin), 학생(Student), 학부모(Parent) 세 역할이 각자의 권한 범위 안에서 서비스를 이용합니다.

### 주요 기능

| 역할        | 기능                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| **Admin**   | 학생·학부모 계정 승인 / 반 관리 및 수강생 배정 / 시험 출제 및 성적 입력 / 공지사항·학습자료·교재 관리 |
| **Student** | 내 반 조회 / 성적 및 오답 확인 / 숙제 진도 조회 / 공지사항·학습자료 열람 / 동영상 수강                |
| **Parent**  | 자녀 성적 및 진도 조회 / 공지사항 열람                                                                |

---

## 2. 기술 스택

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat&logo=amazonaws&logoColor=white)

---

## 3. 시스템 아키텍처

<img width="1099" height="559" alt="image" src="https://github.com/user-attachments/assets/ac6aa626-b02d-4437-b183-9bb8a57f9e91" />


---

## 4. API 명세

Swagger UI를 통해 전체 API 명세를 확인할 수 있습니다.

> [https://api.kwakmath.co.kr/docs](https://api.kwakmath.co.kr/docs)

---

## 5. 인증 플로우

### 사용자 등록 및 승인

신규 가입 시 계정은 `PENDING` 상태로 생성되며, Admin이 승인해야 `APPROVED`로 전환되어 서비스를 이용할 수 있습니다.

```
회원가입 → PENDING → Admin 승인 → APPROVED → 로그인 가능
```

### JWT + Refresh Token

```
POST /auth/sign-in
  └─ Local Strategy: loginId + bcrypt 비밀번호 검증
  └─ Access Token (Cookie: Authentication) + Refresh Token (Cookie: Refresh) 발급

POST /auth/token
  └─ Refresh Token 검증 → 새 Access Token 재발급

POST /auth/sign-out
  └─ 쿠키 삭제 + DB의 Refresh Token 제거
```

- **Access Token**: HttpOnly 쿠키로 전달, 짧은 만료시간
- **Refresh Token**: HttpOnly 쿠키로 전달, DB 저장, 재발급 시 교체
- **비밀번호 해싱**: bcrypt (argon2id 대비 부하테스트에서 서버 자원 효율이 높아 채택)

### 역할별 권한

| Guard                             | 설명                                 |
| --------------------------------- | ------------------------------------ |
| `JwtAuthGuard`                    | Access Token 검증                    |
| `JwtRefreshAuthGuard`             | Refresh Token 검증                   |
| `RolesGuard` + `@Roles()`         | ADMIN / STUDENT / PARENT 역할 제한   |
| `ClassAccessGuard`                | 해당 반 소속 여부 확인               |
| `VideoAccessGuard`                | 영상 접근 권한 확인                  |
| `StudentOrParentOwnsStudentGuard` | 본인 또는 자녀 데이터 접근만 허용    |
| `UserIdThrottlerGuard`            | 전역 Rate Limit (유저당 120 req/min) |

---

## 6. Redis 캐싱 전략

읽기 빈도가 높고 변경 빈도가 낮은 목록 API를 대상으로 Cache-Aside 패턴을 적용했습니다.
캐시 무효화는 키 구조에 따라 두 가지 전략으로 나눠 설계했습니다.

### 전략 A — 버전 카운터 증가 (동적 키)
```
시험·공지·학습자료처럼 classId, 월별 필터 등 조건에 따라 
캐시 키가 동적으로 생성되는 경우 적용
조회 시: ver 키 조회 → {resource}:list:...:v:{ver} 조회 → 없으면 DB 조회 후 캐시 저장
변경 시: ver 키 +1 증가 → 이전 캐시는 TTL(10분) 후 자연 만료
```
### 전략 B — 직접 삭제 (고정 키)
```
학생·학부모·클래스처럼 캐시 키가 고정된 경우 적용
조회 시: 고정 키로 캐시 조회 → 없으면 DB 조회 후 캐시 저장
변경 시: 해당 고정 키 직접 삭제
```
### 공통
- 캐시 장애 시 DB fallback으로 서비스 안정성 보장
- Redis 설정: LRU 정책, 최대 200MB
- TTL: 목록 키 10분, 버전 키 1일


### 캐시 적용 API

| 역할    | API                          | 캐시 키                                                     |
| ------- | ---------------------------- | ----------------------------------------------------------- |
| Admin   | 반 목록 조회                 | `admin:classes:list`                                        |
| Admin   | 학생 목록 조회 (1페이지)     | `admin:students:list:page:1`                                |
| Admin   | 학부모 목록 조회 (1페이지)   | `admin:parents:list:page:1`                                 |
| Admin   | 반별 수강생 목록 조회        | `admin:classes:{classId}:students:list`                     |
| Admin   | 반별 시험 월별 목록          | `admin:classes:{classId}:exams:list:month:{yyyymm}:v:{ver}` |
| Admin   | 반별 학습자료 목록 (1페이지) | `admin:classes:{classId}:materials:list:page:1:v:{ver}`     |
| Admin   | 반별 공지사항 목록 (1페이지) | `admin:classes:{classId}:notices:list:page:1:v:{ver}`       |
| Student | 내 반 목록 조회              | `student:user:{userId}:classes:list`                        |
| Student | 반별 공지사항 목록 (1페이지) | `student:classes:{classId}:notices:list:page:1:v:{ver}`     |
| Student | 반별 학습자료 목록 (1페이지) | `student:classes:{classId}:materials:list:page:1:v:{ver}`   |
| Parent  | 반별 공지사항 목록 (1페이지) | `parent:classes:{classId}:notices:list:page:1:v:{ver}`      |


---

## 7. 성능 테스트
### 테스트 환경

- **도구**: k6
- **시나리오**: 로그인 후 주요 API 순차 호출 (Ramp-up)
- **서버**: AWS EC2 t4g.small

### 200명일때 테스트 결과
<img width="1876" height="839" alt="image" src="https://github.com/user-attachments/assets/9ca03aed-d882-481a-8bb5-870e5e715d74" />
<img width="1537" height="566" alt="image" src="https://github.com/user-attachments/assets/f57744ec-1f91-461c-9375-0e8acaa5576b" />
<img width="1908" height="740" alt="image" src="https://github.com/user-attachments/assets/f3d3dc8b-ef6d-45c9-80be-2ec5a347809e" />

### VU별 전체 지표 비교
<img width="718" height="291" alt="image" src="https://github.com/user-attachments/assets/583fd414-2b43-47a7-a7e5-60297cd368d9" />

### API별 속도 비교 
<img width="740" height="658" alt="image" src="https://github.com/user-attachments/assets/9a150073-ff9a-4121-a58c-d13c41a8ad9a" />

### 주요 결과
- ✅ 100VU ~ 200VU 구간에서 실패율 0% 유지
- ✅ 모든 API p95 500ms 이하 달성
- ⚠️ 로그인 API는 bcrypt 특성상 부하 증가 시 응답시간 상승




---

## 8. 폴더 구조

```
academy/
├── src/
│   ├── action-logs/        # 사용자 액션 감사 로그
│   ├── admin/              # 관리자 프로필
│   ├── analysis/           # 데이터 분석
│   ├── auth/               # 인증 (JWT, Passport, Guards)
│   ├── class/              # 반 관리
│   ├── class-textbook/     # 반-교재 연결
│   ├── configs/            # DB, 환경변수 설정
│   ├── constants/          # 공통 상수 (메시지, 캐시 키)
│   ├── exam/               # 시험 출제 및 관리
│   ├── grades/             # 성적 및 오답
│   ├── homework/           # 숙제 진도
│   ├── materials/          # 학습자료 (S3 연동)
│   ├── migrations/         # TypeORM 마이그레이션
│   ├── notices/            # 공지사항
│   ├── parents/            # 학부모 프로필
│   ├── s3/                 # AWS S3 + CloudFront 연동
│   ├── seeds/              # 더미 데이터 시딩
│   ├── student-class/      # 학생-반 수강 관계
│   ├── students/           # 학생 프로필
│   ├── textbook/           # 교재 및 단원
│   ├── users/              # 공통 유저 (승인 워크플로우)
│   ├── util/               # 공통 유틸리티, 데코레이터
│   ├── videos/             # 영상 (Bunny CDN 연동)
│   └── webhook/            # Sentry → Discord 웹훅
├── k6/                     # 부하테스트 시나리오
├── hooks/                  # Claude Code 훅
├── docker-compose.yml
└── .env
```

## 9. 모니터링

### 모니터링 전략
```
Vercel 대시보드 (직접 확인)
├── 배포 성공/실패
├── Edge Requests (트래픽 패턴)
├── Fast Data Transfer (데이터량)
├── Analytics (방문자, 유입 경로)
└── Speed Insights (LCP, FID, CLS)

Sentry + Discord (알림 + 상세 추적)
├── 에러 발생 즉시 알림
└── 에러 상세 내용, 스택트레이스

Grafana (지표 시각화 + 알림)
├── EC2 서버 상태
├── NestJS 앱 응답 시간, 요청 수
├── 임계값 초과하게되면 Discord 알림
└── 서버
    1. SWAP Used 70% 이상
    2. RAM Used 85% 이상
    3. CPU Busy 30% 이상
    4. Root FS 80% 이상
└── NestJS 앱
    5. Event Loop Latency 100ms 이상
    6. Heap Used 95% 이상
    7. CPU 사용량 50% 이상

UptimeRobot (생존 확인)
└── 서버 다운 즉시 Discord 알림


Bunny (영상 트래픽 )
├── Views — 영상별 재생 횟수
├── Watch Time — 평균 시청 시간 (영상을 끝까지 보는지)
├── Bandwidth — 영상별 트래픽 사용량
├── Cache Hit Rate — 높을수록 좋아요. 70~80% 이상이면 정상
├── Cache Miss — 이게 높으면 원본 서버(EC2)로 요청이 많이 가는 것
└── 서버 다운 즉시 알림


RDS 
├── CPUUtilization                    - 50% 이상 주의, 80% 이상 위험
├── DatabaseConnections               - 50 이상 주의, 100 이상 위험
├── FreeStorageSpace ( 현재 20기가 ) - 20% 이하 주의, 10% 이하 위험
└── ReadLatency / WriteLatency        - 20ms 이상 주의, 100ms 이상 위험

R2 한달에 한번 용량 확인
무료 한도
→ 저장 용량: 10GB/월
→ Class A (쓰기): 1,000,000회/월
→ Class B (읽기): 10,000,000회/월
```

### 모니터링 체크리스트
매일 다음과 같이 체크리스트를 활용하여 점검했습니다. 
<img width="456" height="279" alt="image" src="https://github.com/user-attachments/assets/f0bf8f17-9af2-4d62-9764-492ff49bf0d2" />


