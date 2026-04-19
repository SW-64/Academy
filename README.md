# Academy Management System

학원 선생님이 학생과 학부모를 편리하게 관리할 수 있도록 설계된 NestJS 기반 백엔드 서비스입니다.

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [ERD](#4-erd)
5. [API 명세](#5-api-명세)
6. [인증 플로우](#6-인증-플로우)
7. [Redis 캐싱 전략](#7-redis-캐싱-전략)
8. [성능 테스트](#8-성능-테스트)
9. [폴더 구조](#9-폴더-구조)

---

## 1. 프로젝트 소개

### 서비스 개요

학원 운영에 필요한 학생 관리, 수업 배정, 시험 성적, 숙제 진도, 공지사항, 학습자료 등을 하나의 플랫폼에서 처리합니다.
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

<img width="960" height="531" alt="Image" src="https://github.com/user-attachments/assets/b279f5ef-9370-4617-baf8-10f47342623a" />

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
캐시 무효화는 버전 키(`ver`) 증가 방식을 사용해 삭제 없이 자연 만료되도록 처리합니다.

```
조회 시: ver 키 조회 → {resource}:list:...:v:{ver} 조회 → 없으면 DB 조회 후 캐시 저장
변경 시: ver 키 +1 증가 → 이전 캐시는 TTL(10분) 후 자연 만료
```

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

> Redis 설정: LRU 정책, 최대 200MB / TTL: 목록 키 10분, 버전 키 1일

---

## 7. 성능 테스트

<!-- 부하테스트 시나리오, Grafana 스크린샷, 측정 결과를 여기에 추가해주세요 -->

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
