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
RUN npm run build

# 3. 실행 단계
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]