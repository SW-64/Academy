# Academy Management System

학원 선생님이 학생과 학부모를 편리하게 관리할 수 있도록 설계된 NestJS 기반 백엔드 서비스입니다.

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [주요 트러블 슈팅](#4-주요-트러블-슈팅)
5. [성능 / 최적화](#5-성능--최적화)
6. [보안](#6-보안)
7. [모니터링](#7-모니터링)

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

### 외부 서비스 선택

비용 구조를 기준으로 외부 서비스를 선택해 운영 비용을 최소화했다.

| 서비스 | 용도 | 선택 이유 |
| ------ | ---- | --------- |
| **Cloudflare R2** | 파일 스토리지 | AWS S3와 달리 이그레스(전송) 비용이 없어, 파일 다운로드가 많아도 비용이 늘지 않음 |
| **Bunny CDN** | 영상 스토리지·스트리밍 | CloudFront와 달리 요청당 과금이 없고 대역폭으로만 과금. 영상은 조각 요청이 많아 요청 과금이 없는 Bunny가 유리. 인코딩도 무료 포함 |
| **Moonshot (Kimi K2.6)** | 시험지 해설 AI | 수학·추론 벤치마크 상위권 중 토큰 비용이 낮아 성능 대비 비용이 효율적 |

---

## 4. 주요 트러블 슈팅

### Bunny CDN 고아 객체 문제

#### 문제

영상 업로드를 비동기로 처리하는데, 업로드가 중간에 실패하면 Bunny CDN에 생성된 영상 객체가 삭제되지 않고 남는 문제를 발견했다. DB에는 영상 정보가 없는데 Bunny에는 영상이 남아, 어디서도 참조되지 않는 고아(orphan) 데이터가 쌓일 수 있었다.

#### 원인

고아 객체는 두 가지 경로로 생긴다.

- **업로드 실패**: `Bunny 객체 생성 → 파일 업로드 → DB 저장` 중간에 실패하면, 이미 만든 Bunny 객체가 남는다. (`FAILED`)
- **삭제 실패**: 어드민이 영상 삭제를 요청해 DB에선 삭제 처리됐지만 Bunny 삭제가 실패하면, Bunny에만 영상이 남는다. (`DELETING`)

두 경우 모두 외부 서비스(Bunny)와 DB 상태가 어긋나는 정합성 문제다.

#### 해결

실패를 두 단계로 처리했다.

**1단계 — 업로드 실패 시 즉시 Bunny 객체 삭제 시도**

```typescript
// videos.service.ts
} catch (error) {
  await this.videoRepository.update(videoId, { status: VideoStatus.FAILED });

  // 즉시 보상 삭제 시도
  try {
    await this.bunnyService.deleteVideo(bunnyVideoId);
  } catch (deleteError) {
    const delErr = deleteError instanceof Error ? deleteError : new Error(String(deleteError));
    this.logger.error('Bunny 보상 삭제 실패 (배치에서 재시도)', {
      videoId,
      bunnyVideoId,
      error: delErr.message,
    });
  }
}
```

**2단계 — 즉시 삭제마저 실패한 경우, 매일 새벽 4시 배치로 재처리**

1일 이상 지난 고아 객체를 두 가지 상태로 나눠 찾아 Bunny 삭제를 재시도한다.
- `FAILED` — 업로드 실패 후 보상 삭제까지 실패한 영상
- `DELETING` — 어드민이 삭제 요청했으나 Bunny 삭제가 실패한 영상

```typescript
// videos.service.ts
@Cron('0 4 * * *')
async cleanupOrphanBunnyVideos(): Promise<void> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const deletingVideos = await this.videoRepository.find({
    where: {
      status: VideoStatus.DELETING,
      deletedAt: LessThan(oneDayAgo),
    },
    withDeleted: true,
    select: ['videoId', 'bunnyVideoId'],
  });

  const failedVideos = await this.videoRepository.find({
    where: {
      status: VideoStatus.FAILED,
      updatedAt: LessThan(oneDayAgo),
    },
    select: ['videoId', 'bunnyVideoId'],
  });

  for (const video of deletingVideos) {
    await this.cleanupBunnyVideo(video.videoId, video.bunnyVideoId, 'DELETING');
  }

  for (const video of failedVideos) {
    await this.cleanupBunnyVideo(video.videoId, video.bunnyVideoId, 'FAILED');
  }
}
```

### 로그인 간헐적 실패

#### 문제

부하 테스트 중, 이미 로그인한 적 있는 사용자가 다시 로그인할 때 간헐적으로 로그인이 실패하는 현상을 발견했다. 처음 가입한 사용자는 정상인데, 재로그인하는 사용자에게서만 실패가 나타났다.

#### 원인

Refresh Token을 저장할 때 `createQueryBuilder().insert()`에 `orUpdate`를 사용해 `INSERT ... ON DUPLICATE KEY UPDATE`로 처리한다. 첫 로그인은 INSERT, 재로그인은 UPDATE 분기를 탄다.

문제는 TypeORM의 `InsertQueryBuilder`가 기본적으로 INSERT 후 `insertId`로 방금 처리한 엔티티를 재조회한다는 점이다. 그런데 UPDATE 분기에서는 MySQL이 `insertId`를 0으로 반환한다. 존재하지 않는 `id=0`인 행을 재조회하려다 실패한 것이 간헐적 로그인 오류의 원인이었다.

```
첫 로그인 → INSERT → insertId = 정상값 → 재조회 성공
재로그인  → UPDATE → insertId = 0      → id=0 재조회 → 실패
```

#### 해결

`.updateEntity(false)` 옵션을 추가해 INSERT 후의 불필요한 재조회를 비활성화했다. 이 메서드의 반환값을 사용하지 않으므로 부작용 없이 문제를 해결했고, 재조회 쿼리가 사라져 쿼리도 하나 줄었다.

```typescript
// auth.service.ts
await this.refreshTokenRepository
  .createQueryBuilder()
  .insert()
  .into(RefreshToken)
  .values({
    userId: userId,
    refreshtoken: refreshToken,
    createdAt: new Date(),
    expiresAt: expiresAt,
  })
  .orUpdate(['refreshtoken', 'expires_at'], ['userId'])
  .updateEntity(false) // UPDATE 분기에서 insertId=0으로 인한 재조회 실패 방지
  .execute();
```

#### 결과

재로그인 시 간헐적 실패가 사라졌고, 부하 테스트에서 로그인 에러율 0%를 달성했다.

---

## 5. 성능 검증 / 최적화

### 부하 테스트

#### 측정 환경

EC2 t4g.small (2GB RAM), k6 사용, 300 VU Ramp-up 시나리오 기준으로 측정했다.

<!-- 사진 ①: k6 부하 테스트 구성/시나리오 또는 VU 곡선 -->

#### 측정 방법론

처음엔 로그인/로그아웃을 반복하는 스크립트로 테스트했는데, 실사용자는 그렇게 행동하지 않아 CPU 사용률이 80%로 과장됐다. 로그인 1회 후 토큰을 재사용하는 현실적인 패턴으로 바꾸자 CPU가 50%로 낮아졌다. 잘못된 측정으로 엉뚱한 결론을 내리지 않으려 테스트를 실사용 패턴에 맞게 설계했다.

<!-- 사진 ②: CPU 80% → 50% Grafana 그래프 -->

#### 결과

전 API p95 < 1s SLA를 충족했으며, 약 40 RPS를 아래 수치로 처리했다.

| 지표 | 값 |
| ---- | -- |
| p95  | 336ms |
| p99  | 520ms |
| 에러율 | 0% |

<!-- 사진 ③: k6 결과 요약 화면 (p95/p99/에러율) -->

---

### 동시성 최적화 (AI 해설)

#### 배경

시험지 해설은 외부 AI(Moonshot) API를 호출하기 때문에 응답까지 장시간이 걸린다. HTTP 요청 흐름을 블로킹하지 않도록 **BullMQ 비동기 큐**로 분리해 처리한다.

#### 최적화

순차 처리(동시성 1)로 실행하면 55분이 소요됐다. Moonshot API의 동시성 한도(3)에 맞춰 3개를 병렬 처리하자 19분으로 단축됐다.

병렬 처리 수는 두 가지 제약으로 결정된다 — 외부 API가 허용하는 동시 요청 수와, 서버의 메모리다. 사용 중인 Moonshot API의 Tier0 등급은 동시 요청 한도가 3이고, 3개 병렬 처리 시 EC2 메모리도 여유가 있어 한도에 맞춰 3으로 설정했다.

| 동시성 | 처리 시간 |
| ------ | --------- |
| 1 (순차) | 55분 |
| 3 (병렬) | 19분 |

> 같은 시험지를 3회씩 측정한 평균값 기준

<!-- 사진 ④: 동시성 측정 결과 (55분/19분 비교 또는 Moonshot Tier 화면) -->

#### 결과

약 2.8배 처리 시간 단축

---

## 6. 보안

### SSM Session Manager

SSH 키 없이 **AWS SSM Session Manager**를 통해 EC2에 접속합니다.
EC2의 22번 포트(SSH)를 열 필요 없이 IAM 권한만으로 터미널 세션을 시작할 수 있습니다.

```bash
aws ssm start-session \
  --target i-xxxxxxxxxxxxxxxxx \
  --region ap-northeast-2
```

| 항목      | 기존 SSH 방식  | Session Manager          |
| --------- | -------------- | ------------------------ |
| 포트 개방 | 22번 오픈 필요 | 불필요                   |
| 자격증명  | SSH 키 관리    | IAM 역할                 |
| 감사 로그 | 별도 설정 필요 | AWS CloudTrail 자동 기록 |

### Refresh Token Rotation

액세스 토큰 재발급 시 리프레시 토큰도 함께 교체합니다. DB에는 `userId`당 최신 토큰 1개만 유지(Upsert)되므로 탈취된 구 토큰을 재사용할 수 없습니다.

```typescript
// auth.service.ts
async reissueAccessToken(userId: number, role: Role, res: Response) {
  const { accessToken, ...accessOption } = this.createAccessToken(userId, role);
  const { refreshToken, ...refreshOption } = this.createRefreshToken(userId);
  await this.setCurrentRefreshToken(refreshToken, userId); // DB Upsert로 구 토큰 즉시 무효화
  res.cookie('Authentication', accessToken, accessOption);
  res.cookie('Refresh', refreshToken, refreshOption);
  return { accessToken };
}

// Upsert: 같은 userId의 토큰은 항상 1개만 존재
await this.refreshTokenRepository
  .createQueryBuilder()
  .insert()
  .into(RefreshToken)
  .values({ userId, refreshtoken: refreshToken, expiresAt })
  .orUpdate(['refreshtoken', 'expires_at'], ['userId'])
  .updateEntity(false)
  .execute();
```

토큰은 모두 **HttpOnly 쿠키**로 전달해 JavaScript에서 접근할 수 없도록 합니다.

### HttpOnly + SameSite 쿠키

액세스 토큰과 리프레시 토큰 모두 동일한 쿠키 옵션으로 발급합니다.

```typescript
// auth.service.ts
private getCookieBaseOption() {
  return {
    path: '/',
    httpOnly: true,                                                        // JS에서 document.cookie 접근 불가
    secure: this.configService.get('NODE_ENV') === 'production',          // HTTPS에서만 전송
    sameSite: this.configService.get('COOKIE_SAMESITE') ?? 'lax',        // 외부 사이트 요청 시 쿠키 미전송
  } as const;
}
```

| 옵션             | 설정값          | 방어 대상                                                               |
| ---------------- | --------------- | ----------------------------------------------------------------------- |
| `httpOnly: true` | 항상 적용       | **XSS** — 악성 스크립트가 `document.cookie`로 토큰을 탈취하는 공격 차단 |
| `sameSite: lax`  | 환경변수로 주입 | **CSRF** — 외부 사이트에서 유발한 요청에 쿠키가 자동 첨부되는 공격 차단 |
| `secure: true`   | production 한정 | 토큰이 암호화되지 않은 HTTP 채널로 노출되는 것을 방지                   |

---

## 7. 모니터링

### Sentry — 에러 추적 및 성능 프로파일링

`src/instrument.ts`를 `main.ts` 최상단에서 임포트해 모든 요청의 트레이스와 프로파일을 수집합니다.

```typescript
// src/instrument.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0, // 요청 100% 추적
  profilesSampleRate: 1.0, // CPU 프로파일 100% 수집
  environment: process.env.NODE_ENV,
});
```

Sentry 이슈 발생 시 Webhook을 통해 Discord 알림을 전송합니다 (`POST /webhook/sentry`).

### Prometheus + Grafana — 메트릭 수집

`/metrics` 엔드포인트에서 NestJS 기본 메트릭(HTTP 요청 수, 응답 시간, 메모리 등)을 노출합니다.

```typescript
// app.module.ts
PrometheusModule.register({
  defaultMetrics: { enabled: true },
  path: '/metrics',
});
```

Prometheus는 EC2 서버에 직접 설치해 `/metrics`를 주기적으로 스크레이핑하고, 수집된 데이터는 **Grafana Cloud**에서 대시보드로 시각화합니다.
