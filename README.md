# Academy Management System

학원 선생님이 학생과 학부모를 편리하게 관리할 수 있도록 설계된 NestJS 기반 백엔드 서비스입니다.

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [AI 시험지 해설](#4-ai-시험지-해설)
5. [부하 테스트](#5-부하-테스트)
6. [주요 트러블 슈팅](#6-주요-트러블-슈팅)
7. [보안](#7-보안)
8. [모니터링](#8-모니터링)

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

<p align="center">
  <img width="960" height="531" alt="Image" src="https://github.com/user-attachments/assets/b279f5ef-9370-4617-baf8-10f47342623a" />
  <br>
  <em>전체 시스템 구성도</em>
</p>

### 외부 서비스 선택

비용 구조를 기준으로 외부 서비스를 선택해 운영 비용을 최소화했다.

| 서비스                   | 용도                   | 선택 이유                                                                                                                         |
| ------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare R2**        | 파일 스토리지          | AWS S3와 달리 이그레스(전송) 비용이 없어, 파일 다운로드가 많아도 비용이 늘지 않음                                                 |
| **Bunny CDN**            | 영상 스토리지·스트리밍 | CloudFront와 달리 요청당 과금이 없고 대역폭으로만 과금. 영상은 조각 요청이 많아 요청 과금이 없는 Bunny가 유리. 인코딩도 무료 포함 |
| **Moonshot (Kimi K2.6)** | 시험지 해설 AI         | 수학·추론 벤치마크 상위권 중 토큰 비용이 낮아 성능 대비 비용이 효율적                                                             |

---

## 4. AI 시험지 해설

시험지 PDF를 업로드하면 AI(Kimi K2.6)가 문제를 풀어 해설을 생성하는 기능이다.

### 비동기 처리

AI 해설은 외부 API(Moonshot) 호출이라 응답까지 수십 분이 걸린다.
HTTP 요청 흐름을 블로킹하면 사용자가 그동안 대기하거나 요청이 타임아웃되므로,
요청 시 작업을 BullMQ 큐에 넣고 즉시 jobId를 반환한 뒤 백그라운드에서 처리한다.
처리 결과는 작업 상태(jobId)로 조회한다.

```
POST /solve  →  enqueue()  →  jobId 즉시 반환
                                    ↓
                          BullMQ Worker (백그라운드)
                                    ↓
GET /solve/:jobId  →  getStatus()  →  { status, result }
```

**요청 시: 큐에 등록 후 jobId 즉시 반환**

```typescript
// analysis.service.ts
async enqueue(files: Express.Multer.File[]): Promise<{ jobId: string }> {
  const jobId = uuidv4();

  // 1. Moonshot 파일 서버에 이미지 업로드
  const fileIds = await Promise.all(
    files.map((f) => this.uploadFileToMoonshot(f.buffer, f.originalname, f.mimetype)),
  );

  // 2. DB에 pending 상태로 작업 저장
  await this.analysisRepository.save(
    this.analysisRepository.create({ jobId, status: 'pending', images: JSON.stringify(fileIds) }),
  );

  // 3. BullMQ 큐에 등록 (실제 처리는 Worker가 백그라운드에서 수행)
  await this.analysisQueue.add('solve', { jobId, fileIds }, { jobId, attempts: 3 });

  return { jobId }; // 클라이언트에 즉시 반환
}
```

**백그라운드 처리: Worker가 큐에서 꺼내 AI 호출 후 DB 업데이트**

```typescript
// analysis.processor.ts
@Processor('analysis', { concurrency: 3 })
export class AnalysisProcessor extends WorkerHost {
  async process(job: Job<SolveJobData>): Promise<void> {
    const { jobId, fileIds } = job.data;

    await this.analysisRepository.update({ jobId }, { status: 'processing' });

    const images = fileIds.map((id) => `ms://${id}`);
    const result = await this.analysisService.processImages(images); // AI 호출 (수십 분 소요)

    await this.analysisRepository.update(
      { jobId },
      { result: JSON.stringify(result), status: 'completed' },
    );
  }
}
```

**결과 조회: jobId로 상태와 해설 반환**

```typescript
// analysis.service.ts
async getStatus(jobId: string): Promise<{ jobId: string; status: string; result: SolveResponse | null }> {
  const record = await this.analysisRepository.findOne({ where: { jobId } });
  if (!record) throw new NotFoundException(`jobId ${jobId}를 찾을 수 없습니다.`);

  return {
    jobId,
    status: record.status, // pending | processing | completed | failed
    result: record.status === 'completed' ? JSON.parse(record.result) : null,
  };
}
```

### 동시성 최적화

#### 배경

시험지 해설은 외부 AI(Moonshot) API를 호출하기 때문에 응답까지 장시간이 걸린다. HTTP 요청 흐름을 블로킹하지 않도록 **BullMQ 비동기 큐**로 분리해 처리한다.

#### 최적화

순차 처리(동시성 1)로 실행하면 55분이 소요됐다. Moonshot API의 동시성 한도(3)에 맞춰 3개를 병렬 처리하자 19분으로 단축됐다.

병렬 처리 수는 두 가지 제약으로 결정된다 — 외부 API가 허용하는 동시 요청 수와, 서버의 메모리다. 사용 중인 Moonshot API의 Tier0 등급은 동시 요청 한도가 3이고, 3개 병렬 처리 시 EC2 메모리도 여유가 있어 한도에 맞춰 3으로 설정했다.

> 같은 시험지를 3회씩 측정한 평균값 기준

| 동시성   | 1회  | 2회  | 3회  | 평균    |
| -------- | ---- | ---- | ---- | ------- |
| 3 (병렬) | 18분 | 19분 | 21분 | 약 19분 |
| 1 (순차) | 58분 | 51분 | 56분 | 약 55분 |

#### 결과

약 2.8배 처리 시간 단축

---


### 토큰량을 줄이기 위해 크롭 적용

#### 배경

2026년 기준 AI Vision 모델들을 실무에서 어떻게 쓰냐는 가이드를 발견했다.

이미지를 최적화하려면 크롭을 진행해야한다는 글을 보고 바로 적용시켰다.

#### 크롭을 어떻게 진행?
<img width="593" height="825" alt="image" src="https://github.com/user-attachments/assets/ad073278-88e4-42c3-b242-43d27a6b54b8" />

보라색 부분은 제거하고, 하늘색 부분과 분홍색 부분. 이렇게 2개로 크롭을 진행시켰다.

#### 결과

크롭 전: 117,361
크롭 후: 146,850

크롭 전은 7장, 크롭 후는 14장으로 각각 장당 토큰량이 동일했다.

입력 토큰량은 해상도로 결정하는데, 크롭 전/후의 해상도가 4K 해상도에 가까웠기 때문이다.

Kimi의 정책은 다음과 같다.

크롭 전은 기준 해상도인 4K를 넘겼기에, 4K 상한선까지 강하게 줄인다. 즉, 최종적으로 4K 근처에 다다랐다.

크롭 후는 기준 해상도인 4K 바로 아래에 위치했다.

그러므로 입력 토큰량을 결정하는 해상도가 비슷하기에 장당 토큰이 동일했다.

더 자세한 내용은 블로그로 정리를 했다.
https://development-getting-better.tistory.com/186


## 5. 부하 테스트

### 측정 환경

EC2 t4g.small (2GB RAM), k6 사용, 300 VU Ramp-up 시나리오 기준으로 측정했다.

<p align="center">
  <img width="1824" height="825" alt="image" src="https://github.com/user-attachments/assets/c2a6d5c3-8f2b-4c85-ba1b-9300c13ba644" />
  <br>
  <em>300 VU 부하 테스트 중 Grafana 메트릭 대시보드</em>
</p>

<p align="center">
  <img width="1530" height="727" alt="image" src="https://github.com/user-attachments/assets/5f1be4fc-511f-4d0b-9e7b-785b3ac84a91" />
  <br>
  <em>k6 테스트 진행 중 DB CPU · 메모리 사용률</em>
</p>

### 측정 방법론

처음엔 로그인/로그아웃을 반복하는 스크립트로 테스트했는데, 실사용자는 그렇게 행동하지 않아 CPU 사용률이 80%로 과장됐다. 로그인 1회 후 토큰을 재사용하는 현실적인 패턴으로 바꾸자 CPU가 50%로 낮아졌다. 잘못된 측정으로 엉뚱한 결론을 내리지 않으려 테스트를 실사용 패턴에 맞게 설계했다.

**[수정 후 학생 시나리오]**

```
로그인 → sleep(2)
  └→ 내 클래스 목록 전체 조회 → sleep(2)
       └→ 클래스 목록에서 랜덤 1개 선택
            └→ 공지사항 전체 조회 → sleep(5)
                 └→ [50%] 공지사항 상세 조회 → sleep(10)
            └→ 교재 목록 조회 → sleep(5)
            └→ 숙제 진도 목록 조회 → sleep(10)
            └→ 학습자료 목록 조회 → sleep(5)
                 └→ [50%] 학습자료 상세 조회 → sleep(10)
            └→ 시험점수 전체 조회 → sleep(10)
            └→ 시험 등수 조회 → sleep(10)
```

**[수정 후 학부모 시나리오]**

```
로그인 → sleep(2)
  └→ 자녀 조회 → sleep(2)
       └→ 내 클래스 전체 목록 조회 → sleep(2)
            └→ 클래스 목록에서 랜덤 1개 선택
                 └→ 공지사항 전체 조회 → sleep(5)
                      └→ [50%] 공지사항 상세 조회 → sleep(10)
                 └→ 숙제 진도 목록 조회 → sleep(10)
                 └→ 시험점수 전체 조회 → sleep(10)
                 └→ 시험 등수 조회 → sleep(10)
```

**[부하테스트 흐름 및 임계값]**

```
VU
300 |                    _______________
    |                   /               \
200 |         _________/                 \
    |        /                            \
  0 |_______/                              \___
    0      90s         180s          +3m   +30s

학생 (200 VU) : ramp-up 0 → 200 / 90s, 유지 3m, ramp-down 30s
학부모 (100 VU): 90s 후 시작, ramp-up 0 → 100 / 90s, 유지 3m, ramp-down 30s
최대 동시 VU  : 300

목적: 정상 트래픽에서 threshold 충족 여부 확인
에러율 < 1%

전 API
p(95) < 1000ms
p(99) < 1000ms
```

**[스크립트 수정 전]**

<p align="center">
  <img width="752" height="275" alt="image" src="https://github.com/user-attachments/assets/d7a2ffcf-5583-438d-bbd4-d34e92e6f1d9" />
  <br>
  <em>수정 전: 로그인/로그아웃 반복 스크립트 — CPU 80%</em>
</p>

**[스크립트 수정 후]**

<p align="center">
  <img width="746" height="257" alt="image" src="https://github.com/user-attachments/assets/c67475c6-a75d-411d-a6a2-75c7189d0dc2" />
  <br>
  <em>수정 후: 실사용 패턴 스크립트 — CPU 50%</em>
</p>

#### 결과

전 API p95 < 1s SLA를 충족했으며, 약 40 RPS를 아래 수치로 처리했다.

| 지표   | 값    |
| ------ | ----- |
| p95    | 336ms |
| p99    | 520ms |
| 에러율 | 0%    |

<p align="center">
  <img width="757" height="591" alt="image" src="https://github.com/user-attachments/assets/854145ed-04eb-4ace-ad20-8539e136ebae" />
  <br>
  <em>최종 측정값 — 40 RPS 기준 p95 336ms, 에러율 0%</em>
</p>

---

## 6. 주요 트러블 슈팅

### 1) Bunny CDN 고아 객체 문제

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

### 2) 로그인 간헐적 실패

#### 문제

부하 테스트 중, 간헐적으로 로그인이 실패하는 현상을 발견했다. (1307건 중, 7~8건 실패)
<p align="center">
  <img width="1808" height="506" alt="image" src="https://github.com/user-attachments/assets/96e384b8-d384-4ebd-ba85-785d5497b086" />
  <br>
  <em>부하 테스트 중, 간헐적 로그인 오류 발생</em>
</p>

<p align="center">
  <img width="239" height="48" alt="image" src="https://github.com/user-attachments/assets/cf00bbd3-513f-4615-aed9-f93bb3e6b8a7" />
  <br>
  <em>k6 에러 로그 — 로그인 시 간헐적으로 500 응답</em>
</p>

#### 원인

Refresh Token을 저장할 때 `createQueryBuilder().insert()`에 `orUpdate`를 사용해 `INSERT ... ON DUPLICATE KEY UPDATE`로 처리한다. 
로그인 API는 orUpdate를 실행하지 않고 Insert만 실행하게 설계가 되어있지만 ( 토큰 재발급 API는 orUpdate 실행 )
시나리오 내, 동시성 문제로 인해 로그인 API가 orUpdate가 실행이 되었다. 자세한 내용은 블로그로 서술했다.

[부하테스트 중 발견한 에러](https://development-getting-better.tistory.com/184)

문제는 TypeORM의 `InsertQueryBuilder`가 기본적으로 INSERT 후 `insertId`로 방금 처리한 엔티티를 재조회한다는 점이다. 그런데 UPDATE 분기에서는 MySQL이 `insertId`를 0으로 반환한다. id=0은 유효하지 않아 재조회를 실행하기 전에 에러가 발생한 것이 간헐적 로그인 오류의 원인이었다.

<p align="center">
  <img width="1187" height="272" alt="image" src="https://github.com/user-attachments/assets/697175bf-407d-4b33-a0f7-c132ef8b801b" />
  <br>
  <em>UPDATE 분기에서 MySQL이 insertId=0을 반환하는 쿼리 로그</em>
</p>


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
    expiresAt: expiresAt,
  })
  .orUpdate(['refreshtoken', 'expires_at'], ['userId'])
  .updateEntity(false) // UPDATE 분기에서 insertId=0으로 인한 재조회 실패 방지
  .execute();
```

#### 결과

로그인 API의 간헐적 실패가 사라졌고, 부하 테스트에서 로그인 에러율 0%를 달성했다.

<p align="center">
  <img width="352" height="369" alt="image" src="https://github.com/user-attachments/assets/28d06629-1d2b-4303-94b0-d719a3604119" />
  <br>
  <em>수정 후 로그인 에러율 0% 달성</em>
</p>

---

## 7. 보안

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

## 8. 모니터링

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

### 모니터링 체크리스트

매일 각각의 지표를 Notion과 체크리스트를 통해 관리했습니다.
<p align="center">
  <img width="1392" height="858" alt="image" src="https://github.com/user-attachments/assets/ba7a3722-ec43-4605-96b3-ec6c51b232db" />
  <br>
  <em>Notion 기반 일별 모니터링 체크리스트</em>
</p>
