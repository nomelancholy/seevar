# 1. 의존성 설치 단계
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# 2. 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 시 필요한 환경변수가 있다면 여기에 추가 (예: NEXT_PUBLIC_...)
RUN npx prisma generate
RUN npm run build

# 3. 실행 단계 (standalone: .next/standalone에 필요한 파일만 포함)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
RUN npm install prisma --no-save

EXPOSE 3000
CMD npx prisma migrate deploy && node server.js