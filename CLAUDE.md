# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev       # Watch mode with hot reload
npm run start:debug     # Debug mode

# Build
npm run build           # Compile TypeScript

# Testing
npm run test            # Run all unit tests
npm run test:watch      # Watch mode
npm run test:cov        # With coverage
npm run test:e2e        # End-to-end tests (uses test/jest-e2e.json)
# Run a single test file:
npx jest src/auth/auth.service.spec.ts

# Linting/Formatting
npm run lint            # ESLint with auto-fix
npm run format          # Prettier

# Database Migrations
npm run migration:generate -- src/migrations/MigrationName  # Generate migration
npm run migration:run       # Apply pending migrations
npm run migration:revert    # Revert last migration
```

## Environment Variables

Required in `.env` (validated at startup via Joi in `src/configs/env-validation.config.ts`):

- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` — MySQL connection
- `SERVER_PORT` — App port
- `JWT_SECRET`, `JWT_EXPIRES_IN` — Access token (seconds)
- `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_HASH` — Refresh token
- `PASSWORD_HASH` — bcrypt rounds
- `NODE_ENV` — `development | production | test`
- `COOKIE_SAMESITE`, `COOKIE_DOMAIN` — Cookie config
- `REDIS_HOST` — Redis for caching
- `SENTRY_DSN` — Error tracking
- `SENTRY_WEBHOOK_SECRET`, `DISCORD_WEBHOOK_URL` — Webhook alerts

## Hooks

`hooks/` 디렉토리에 Claude Code 훅이 정의되어 있습니다.

| 파일 | 이벤트 | 동작 |
|---|---|---|
| `env-protection.js` | `PreToolUse` | `.env` 파일 읽기/쓰기 차단 |
| `ts-typecheck.js` | `PostToolUse` | 파일 수정 후 TypeScript 타입 체크 자동 실행 |

## Architecture

NestJS + TypeORM (MySQL) + Redis cache backend. API prefix: `/api/v1`. Swagger docs at `/docs`.

### User / Role Model

`User` entity is the base auth record with three roles: `STUDENT`, `PARENT`, `ADMIN`. Each role has a separate profile entity (`Student`, `Parent`, `Admin`) with a 1:1 relation to `User`. New users start in `PENDING` status and must be approved by admin.

### Auth Flow

- `POST /auth/login` → Local strategy → returns JWT access token (cookie) + refresh token (cookie)
- `POST /auth/refresh` → JWT Refresh strategy → issues new access token
- Guards: `JwtAuthGuard` (access token), `JwtRefreshAuthGuard` (refresh), `RolesGuard` (`@Roles()` decorator), `ClassAccessGuard`, `VideoAccessGuard`, `StudentOrParentOwnsStudentGuard`
- Rate limiting: `UserIdThrottlerGuard` (global, 120 req/min per user)

### Module Structure

Each domain follows the standard NestJS module pattern (`controller` → `service` → `repository via TypeORM`):

| Module | Purpose |
|---|---|
| `auth` | Login, logout, token refresh, JWT strategies |
| `users` | Base user CRUD, approval workflow |
| `students` / `parents` / `admin` | Role-specific profile management |
| `class` / `student-class` | Class management and student enrollment |
| `exam` / `grades` | Exam creation and grade recording |
| `homework` | Homework assignments |
| `notices` | Announcements |
| `textbook` / `class-textbook` | Textbook catalog and class assignments |
| `materials` | Learning materials (file uploads) |
| `videos` | Video content (Bunny CDN integration) |
| `s3` | AWS S3 file upload/presigned URLs + CloudFront |
| `action-logs` | Audit log for user actions |
| `webhook` | Receives Sentry webhooks, forwards to Discord |

### Infrastructure

Docker Compose runs: `backend` (NestJS on port 3000) + `redis` (cache, LRU 200mb) + `prometheus` (port 9090) + `grafana` (port 3001). Metrics exposed at `/metrics`.

Sentry is initialized in `src/instrument.ts` (imported before everything else in `main.ts`).

### Database

- `synchronize: false` — always use migrations for schema changes
- Data source config: `src/configs/data-source.ts`
- Migrations in `src/migrations/`
- Soft deletes used (`DeleteDateColumn`) on `User` and other entities
