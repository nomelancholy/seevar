# See VAR

축구 판정 아카이브 및 커뮤니티 플랫폼. 라운드별 경기·모멘트·심판 통계를 관리하고, 팬들이 VAR 판정에 대해 토론할 수 있습니다.

---

## 주요 기능

- **홈** — 포커스 라운드 경기, Hot Moments, Round Best/Worst 심판, 유튜브/인스타 라운드 미디어
- **경기 아카이브** — 시즌/리그/라운드별 경기 목록·상세, 모멘트·댓글·심판 한줄평
- **심판** — 목록/상세, 경기 배정·평점·통계
- **팀** — 팀 목록/상세, 경기 이력·심판 배정 통계
- **마이** — 프로필, 응원팀(6개월 변경 제한), 내 VAR 모멘트·심판 평점
- **공지** — 공지 목록/상세, 상단 고정·댓글 허용 옵션
- **관리자** — 시즌/리그/라운드 구조, 경기 일정, 신고 처리, 라운드 미디어 링크

---

## 기술 스택

| 구분      | 기술                           |
| --------- | ------------------------------ |
| Framework | Next.js 15+ (App Router)       |
| Language  | TypeScript (Strict)            |
| ORM       | Prisma (PostgreSQL)            |
| Styling   | Tailwind CSS                   |
| UI        | Radix UI / Shadcn UI           |
| Auth      | NextAuth.js v4 (네이버 로그인) |
| 검증      | Zod                            |

---

## 요구 사항

- Node.js 18+
- PostgreSQL
- (선택) Docker — 로컬 DB 띄우기용

---

## 로컬 개발 실행

이 프로젝트는 기본적으로 로컬 PostgreSQL(`localhost:5432`)을 사용합니다. Docker를 사용할 경우 Docker Desktop을 먼저 실행한 뒤 아래 순서로 진행합니다.

### 최초 실행

```bash
npm install
docker compose up -d db
npm run db:push
npm run db:seed:sample
npm run dev
```

- `docker compose up -d db`: PostgreSQL 컨테이너만 백그라운드로 실행합니다.
- `npm run db:push`: 현재 Prisma 스키마를 새 로컬 DB에 반영하고 Prisma Client를 생성합니다.
- `npm run db:seed:sample`: 기본 팀·심판과 로컬 화면 검증용 샘플 데이터를 함께 넣습니다.
- 앱은 [http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

샘플 데이터는 2026년 운영 일정 형태를 참고한 K리그1 27라운드 6경기와 K리그2 25라운드 8경기입니다. 경기 결과, 경기당 심판 6명, 샘플 평가와 쟁점 순간도 포함하며 여러 번 실행해도 같은 샘플 데이터를 갱신합니다. 운영 DB에서 실행되지 않도록 로컬 주소 확인 장치가 들어 있습니다.

팀·심판 기본 데이터만 필요하면 다음 명령을 사용합니다.

```bash
npm run db:seed
```

마이그레이션 파일을 새로 만들거나 검증하는 개발 작업에서는 `npm run db:migrate`를 사용합니다. 단순히 새 로컬 개발 DB를 준비할 때는 대화형 마이그레이션 생성을 요구하지 않는 `npm run db:push`가 편합니다.

`.env`에는 아래 DB 설정이 필요합니다. `DATABASE_URL`을 직접 작성하지 않아도 앱이 이 값들로 자동 생성합니다.

```dotenv
DB_USER=postgres
DB_PASSWORD=로컬_DB_비밀번호
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seevar
```

### 평소 실행

```bash
docker compose up -d db
npm run dev
```

DB 상태와 로그는 다음 명령으로 확인합니다.

```bash
docker compose ps db
docker compose logs -f db
```

개발을 마친 뒤 DB를 중지하려면 다음을 실행합니다. 데이터는 Docker 볼륨에 유지됩니다.

```bash
docker compose stop db
```

### `Can't reach database server at localhost:5432` 오류

1. Docker Desktop이 실행 중인지 확인합니다.
2. 프로젝트 루트에서 `docker compose up -d db`를 실행합니다.
3. `docker compose ps db`에서 상태가 `Up`인지 확인합니다.
4. 계속 실패하면 `.env`의 `DB_PORT`가 다른 PostgreSQL과 충돌하지 않는지 확인합니다.

> `docker compose down -v`는 로컬 DB 볼륨과 데이터를 삭제하므로 초기화가 꼭 필요한 경우에만 사용하세요.

---

## 프로젝트 구조 (요약)

```
seevar/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 로그인·온보딩
│   ├── admin/              # 관리자 (구조, 경기, 신고)
│   ├── matches/            # 경기 목록·아카이브·경기 상세
│   ├── notice/             # 공지 목록·작성·상세
│   ├── referees/           # 심판 목록·상세
│   ├── teams/              # 팀 목록·상세
│   └── my/                 # 마이 정보, VAR 모멘트
├── components/             # React 컴포넌트 (ui, layout, 도메인별)
├── lib/                    # 유틸·액션·스키마
│   ├── actions/            # Server Actions
│   ├── auth.ts             # 세션·관리자 체크
│   ├── prisma.ts           # Prisma 클라이언트 (싱글톤)
│   └── schemas/            # Zod 스키마
├── prisma/
│   ├── schema.prisma       # DB 스키마
│   ├── seed.ts             # 시드
│   └── migrations/         # 마이그레이션
└── public/
```

---

## 참고

- 상세 작업 계획·진행: `progress.md`
- 코딩 규칙·도메인 로직: `.cursorrules`
- DB·시드(팀·심판)·Round 포커스 등: `progress.md` §6 데이터 소스
