# See VAR — 작업 계획 및 진행 상황

`.cursorrules`와 `_reference_ui/` 기준으로 정리한 작업 계획입니다.

---

## 1. 프로젝트 개요 (from .cursorrules)

| 항목          | 내용                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| **목적**      | 축구 판정 아카이브 및 AI(Gemini) 분석 커뮤니티                               |
| **주요 기능** | 라운드별 경기 관리, Server Actions 기반 판정 토론, Prisma 심판 통계 아카이브 |
| **원칙**      | IFAB 규정에 근거한 기술적 분석, 타입 안정성 확보                             |

---

## 2. 기술 스택

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (Strict)
- **ORM**: Prisma (PostgreSQL)
- **Styling**: Tailwind CSS
- **Components**: Radix UI / Shadcn UI
- **State**: RSC 우선, 필요 시 Zustand / React Query
- **AI**: Gemini API (Google Generative AI SDK)

---

## 3. Reference UI → Next.js 매핑

`_reference_ui/` 에 있는 HTML을 Next.js 페이지/기능으로 이전하는 기준입니다.

| Reference 파일          | 예상 경로/기능           | 비고                                              |
| ----------------------- | ------------------------ | ------------------------------------------------- |
| `index.html`            | `/` (홈)                 | FOCUS ROUND, HOT MOMENTS, 네비·프로필·유저 드로어 |
| `about.html`            | `/about`                 | 소개                                              |
| `login.html`            | `/login`                 | 로그인                                            |
| `onboarding.html`       | `/onboarding`            | 온보딩                                            |
| `matches.html`          | `/matches`               | 경기 목록(아카이브)                               |
| `match_upcoming.html`   | `/matches/[id]` (예정)   | 경기 상세 — 예정                                  |
| `match_live.html`       | `/matches/[id]` (라이브) | 경기 상세 — 라이브                                |
| `match_finished.html`   | `/matches/[id]` (종료)   | 경기 상세 — 종료                                  |
| `referee_list.html`     | `/referees`              | 심판 목록                                         |
| `referee.html`          | `/referees/[id]`         | 심판 상세·통계                                    |
| `teams.html`            | `/teams`                 | 팀 목록                                           |
| `supporters.html`       | 서포터즈 관련            | 필요 시 라우트 추가                               |
| `my_information.html`   | 마이페이지 / 설정        | 유저 드로어 또는 `/my`                            |
| `my_var_moments.html`   | 내 VAR 모멘트            | 마이페이지 내                                     |
| `whistle_recharge.html` | 호각 충전                | **후순위** — 일산 호각(결제) 연동 시 추가 개발 예정 |

---

## 4. 디자인 토큰 (\_reference_ui 기준)

Reference UI의 `:root` / `body` 스타일을 Tailwind 또는 CSS 변수로 유지합니다.

- `--ledger-bg`, `--ledger-surface`, `--ledger-border`
- `--accent-var`, `--accent-respect`
- `--text-muted`, `--text-main`
- 폰트: Inter, JetBrains Mono

---

## 5. 작업 계획 체크리스트

### A. 기반 작업

- [x] **Prisma 스키마 보강**  
      Referee, MatchReferee, User 도메인 모델 추가. `MatchStatus`(SCHEDULED/LIVE/FINISHED), `RefereeRole` enum. Round `isFocus` (메인 노출 여부), Match `status` → enum 적용. `prisma generate` 완료.
- [x] Docker Compose 활용해 PostgreSQL DB 생성
- [x] **DB 시드**  
      `prisma/seed.ts`: 리그(K1/K2), 라운드(5라운드 isFocus=true, 1라운드 isFocus=false), 팀(**TEAM_LIST.md** 순서·정확한 팀명+엠블럼), 경기 3건, 심판(**REFEREE_LINK.md** 파싱, name+**link** 나무위키), MatchReferee 샘플. Referee에 **link** 컬럼 추가. `npm run db:seed` (DB 연결 후 `npx prisma db push` 선행).
- [x] **Shadcn UI 도입**  
      `components/ui` 원자 컴포넌트(Button, Input, Sheet), reference 디자인 토큰(ledger)을 Shadcn CSS 변수에 매핑.
- [x] **공통 레이아웃**  
      네비게이션(SiteNav), 검색, 프로필 트리거, 유저 드로어(Supporting 팀·My Information/VAR Moments·로그아웃). **호각·Whistle Recharge**는 후순위로 비노출.
- [ ] **인증 준비**  
      NextAuth.js 또는 커스텀 세션; 로그인/온보딩 라우트 연동.

### B. 페이지 이전 (Reference UI → App Router)

- [x] **홈** (`/`) — HOT MOMENTS, 진행중인 라운드(K1/K2)·경기 카드, 레이아웃·드로어 반영.
- [x] **About** (`/about`) — `about.html` (OUR MISSION, manifesto, Contact, SUPPORT SEE VAR).
- [x] **Login** (`/login`) — `login.html` (SEE VAR, Welcome Back, NAVER LOGIN).
- [x] **Onboarding** (`/onboarding`) — `onboarding.html` (닉네임, Supporting Team 선택).
- [x] **경기 목록** (`/matches`) — DB 연동 경기 목록, `/matches/[id]` 링크.
- [x] **경기 상세** (`/matches/[id]`) — SCHEDULED/LIVE/FINISHED 상태별 표시, 점수·경기장.
- [x] **심판 목록** (`/referees`) — DB 연동 심판 카드, 프로필 링크.
- [x] **심판 상세** (`/referees/[id]`) — 이름, 링크, 경기 수·평점·경고·퇴장.
- [x] **팀 목록** (`/teams`) — K1/K2 팀 그리드, DB 연동.
- [x] **마이페이지** (`/my`, `/my/var-moments`) — 유저 드로어 링크 반영, 플레이스홀더 콘텐츠. `/my/whistle-recharge`는 후순위(호각 결제 연동 시 추가).

### C. 도메인 로직

- [ ] **라운드 활성화**  
      `isFocus` 전환, `activeBetween` 등 서버 헬퍼 (날짜·경기 일정 기준).
- [ ] **경기 상태**  
      SCHEDULED / LIVE / FINISHED enum 및 표시 로직.
- [ ] **심판 통계**  
      `lib/utils/stats.ts` (또는 `lib/services`)에서 평점·통계 계산, Prisma와 연동.
- [ ] **Server Actions**  
      판정 토론 글 작성/수정/삭제. **호각 사용** mutation은 후순위.

### D. AI (See VAR)

- [ ] **Gemini 연동**  
      `lib/ai/gemini.ts` (또는 동일 목적 모듈).
- [ ] **판정 분석 서비스**  
      AiDecisionAnalysisService, IFAB 규정 번호·카테고리 포함 프롬프트.
- [ ] **서버 액션 연동**  
      분석 요청을 서버 액션에서 호출.

### E. 데이터·보안

- [ ] **Zod 스키마**  
      폼·API 요청 검증.
- [ ] **에러 처리**  
      `error.tsx`, try-catch, 검증 실패 시 사용자 메시지.
- [ ] **이미지**  
      팀 로고·하이라이트 `next/image` 최적화.

### F. 성능·운영

- [ ] **캐싱**  
      `unstable_cache`, `revalidatePath` 적절히 사용.
- [ ] **Prisma**  
      `lib/prisma.ts` 싱글톤 유지, N+1 방지 `include` 사용.

---

## 6. 데이터 소스 (DB 시드 vs Fallback)

| 화면/섹션 | 데이터 출처 | 비고 |
|-----------|-------------|------|
| **홈 — K1/K2 라운드 경기** | DB 시드 | `round number: 1` + matches. 시드에서 K1 1라운드 6경기, K2 1라운드 8경기 생성. **DB에 라운드/경기 없으면** → `LeagueMatchesSection`의 **K1_FALLBACK / K2_FALLBACK** 하드코딩 표시. |
| **홈 — HOT MOMENTS** | DB 시드 | `prisma.moment.findMany`. **Moment 테이블 없거나 비어 있으면** → `HotMomentsSection`의 **FALLBACK_MOMENTS** 하드코딩(서울vs울산 등, `matchId` 빈 문자열 → 클릭 시 `/matches`로 이동). |
| **아카이브** (`/matches`) | DB 시드 | `prisma.match.findMany` + moments. 전부 DB. |
| **경기 상세** (`/matches/[id]`) | DB 시드 | `prisma.match.findUnique` + matchReferees, moments. |
| **모멘트 게시판** (`/matches/[id]/moments`) | DB 시드 | 해당 경기의 `match.moments`. |
| **심판 목록/상세** (`/referees`, `/referees/[id]`) | DB 시드 | `prisma.referee` (시드: REFEREE_LINK.md 파싱). |
| **팀 목록** (`/teams`) | DB 시드 | `prisma.team.findMany`. |

**DB 데이터가 보이게 하려면**

1. `.env`에 **DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME**만 있으면 됨. `DATABASE_URL`은 따로 넣을 필요 없고, `lib/database-url.ts`가 위 값들을 조합해 `DATABASE_URL`을 채움(앱·시드·`npm run db:push` 모두 이 경로 사용).
2. 스키마 반영: **enum/테이블 구조 변경이 있고 기존 데이터가 있으면** `npm run db:migrate` 사용. (예: RefereeRole 6개→4개 변경 시 `db push`는 기존 enum 값 때문에 실패하므로 `db:migrate`로 마이그레이션 적용.) 단순 스키마 추가만이면 `npm run db:push` 가능.
3. `npm run db:seed` → 리그, 팀, 라운드(1·5), 경기(K1/K2 1라운드 + K1 5라운드 샘플 3경기), 심판, MatchReferee, **Moments** 시드.

**Round `isFocus` 변경 방법** (메인 노출 ↔ 아카이브만)

- **Prisma Studio**: `npm run db:studio` → `Round` 테이블에서 해당 라운드 행의 `isFocus` 체크박스 토글. `true` = 메인(홈)에 표시, `false` = 아카이브에만 표시.
- **SQL**:  
  `UPDATE "Round" SET "isFocus" = true WHERE id = '라운드_id';`  
  메인에 둘 라운드만 `true`로 두고 나머지는 `false`로 두면 됨.
- **시드**: `prisma/seed.ts`에서 K1/K2 5라운드 생성 시 `isFocus: true`, 1라운드·슈퍼컵은 `isFocus: false`로 설정돼 있음. 시드 다시 실행 시 기존 라운드는 `update`만 되므로 `isFocus`를 바꾸려면 DB에서 직접 수정하거나 시드 로직을 수정해야 함.

---

## 7. 후순위 (추가 개발 예정)

일산 호각(결제) 관련 기능은 추후 연동 시 구현합니다.

| 항목 | 비고 |
|------|------|
| **호각 잔액 표시** | 유저 드로어·마이페이지 내 호각 배지 — 현재 비노출 |
| **Whistle Recharge** | `/my/whistle-recharge` 페이지·드로어 메뉴 — 현재 비노출 |
| **호각 결제/충전** | 결제 연동 후 개발 |
| **호각 사용 mutation** | Server Actions 내 호각 차감 등 — 후순위 |

---

## 8. 진행 기록

| 날짜       | 내용                                                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (최초)     | progress.md 작성. .cursorrules + \_reference_ui 기준 작업 계획 정리.                                                                                                              |
| 2026-02-20 | Prisma 스키마 보강: MatchStatus/RefereeRole enum, Referee, MatchReferee, User 모델 추가. League–Team 관계, Round unique(leagueId, number) 등 보완.                                |
| 2026-02-20 | DB 시드: prisma/seed.ts 작성. K League 1/2, 팀(엠블럼 경로), 라운드 5, 경기 3종, 심판 3명·MatchReferee. Team.slug 추가. package.json에 db:seed, prisma.seed 설정.                 |
| 2026-02-20 | 시드·스키마 정리: 팀명 TEAM_LIST.md 기준으로 수정(전북 현대 모터스, 제주 SK FC, 충북 청주 FC 등). Referee.link(나무위키) 추가, REFEREE_LINK.md 파싱으로 심판 전원 name+link 시드. |
| 2026-02-06 | 데이터 소스 정리: 홈 K1/K2·HOT MOMENTS는 DB 비었을 때 Fallback 하드코딩 사용. progress.md §6 데이터 소스 표 추가.                                                                  |

---

이 문서는 `_reference_ui/` 와 `.cursorrules` 가 바뀔 때마다 맞춰 갱신하는 것을 권장합니다.
