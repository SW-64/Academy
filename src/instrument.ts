// src/instrument.ts
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import * as dotenv from 'dotenv';
dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  // 응답 시간 추적 (0.0 ~ 1.0, 1.0 = 100% 모든 요청 추적)
  tracesSampleRate: 1.0,
  // 프로파일링 (성능 분석)
  profilesSampleRate: 1.0,
  // 배포 환경 구분
  environment: process.env.NODE_ENV,
});
