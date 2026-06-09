# ---- Stage 1: 빌드 ----

# node:20-alpine = Node.js 20버전, alpine은 초경량 리눅스
# AS builder = 이 단계에 "builder"라는 이름을 붙임 (아래서 참조용)
FROM node:20-alpine AS builder

# 컨테이너 안에서 작업할 폴더 위치 지정
# (없으면 자동 생성됨)
WORKDIR /app

# package.json과 package-lock.json만 먼저 복사
# (소스코드보다 먼저 복사하는 이유 → 아래 설명)
COPY package*.json ./

# 의존성 설치
# npm ci = package-lock.json 기준으로 정확히 설치 (npm install보다 안전)
RUN npm ci

# 나머지 소스코드 전체 복사
# (package.json을 먼저 복사한 이유: 소스만 바뀌면 npm ci 캐시를 재사용함 → 빌드 빠름)
COPY . .

# TypeScript → JavaScript 컴파일 (dist/ 폴더 생성)
RUN npm run build


# ---- Stage 2: 운영 실행 ----

# 빌드 결과물만 가져오는 새로운 깨끗한 이미지
# builder 스테이지의 node_modules, ts 소스 등은 여기 포함 안 됨 → 이미지 크기 절약
FROM node:20-alpine AS production

WORKDIR /app

# 운영 환경임을 Node.js에 알림 (성능 최적화 활성화)
ENV NODE_ENV=production

RUN apk add --no-cache poppler-utils

COPY package*.json ./

# --omit=dev = devDependencies 제외하고 설치
# (typescript, jest 같은 개발 도구는 운영에서 불필요)
RUN npm ci --omit=dev && npm cache clean --force

# builder 단계에서 만든 컴파일된 JS 파일만 복사
COPY --from=builder /app/dist ./dist

# 이 컨테이너가 3000번 포트를 사용한다고 문서화
# (실제로 포트를 여는 건 docker-compose가 담당)
EXPOSE 3000

# 컨테이너 시작 시 실행할 명령어
CMD ["node", "dist/main.js"]
