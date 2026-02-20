# See VAR — 작업 계획 및 진행 상황

`.cursorrules`와 `_reference_ui/` 기준으로 정리한 작업 계획입니다.

---

## 1. 프로젝트 개요 (from .cursorrules)

| 항목 | 내용 |
|------|------|
| **목적** | 축구 판정 아카이브 및 AI(Gemini) 분석 커뮤니티 |
| **주요 기능** | 라운드별 경기 관리, Server Actions 기반 판정 토론, Prisma 심판 통계 아카이브 |
| **원칙** | IFAB 규정에 근거한 기술적 분석, 타입 안정성 확보 |

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

| Reference 파일 | 예상 경로/기능 | 비고 |
|----------------|----------------|------|
| `index.html` | `/` (홈) | FOCUS ROUND, HOT MOMENTS, 네비·프로필·유저 드로어 |
| `about.html` | `/about` | 소개 |
| `login.html` | `/login` | 로그인 |
| `onboarding.html` | `/onboarding` | 온보딩 |
| `matches.html` | `/matches` | 경기 목록(아카이브) |
| `match_upcoming.html` | `/matches/[id]` (예정) | 경기 상세 — 예정 |
| `match_live.html` | `/matches/[id]` (라이브) | 경기 상세 — 라이브 |
| `match_finished.html` | `/matches/[id]` (종료) | 경기 상세 — 종료 |
| `referee_list.html` | `/referees` | 심판 목록 |
| `referee.html` | `/referees/[id]` | 심판 상세·통계 |
| `teams.html` | `/teams` | 팀 목록 |
| `supporters.html` | 서포터즈 관련 | 필요 시 라우트 추가 |
| `my_information.html` | 마이페이지 / 설정 | 유저 드로어 또는 `/my` |
| `my_var_moments.html` | 내 VAR 모멘트 | 마이페이지 내 |
| `whistle_recharge.html` | 호각 충전 | 마이페이지 내 |

---

## 4. 디자인 토큰 (_reference_ui 기준)

Reference UI의 `:root` / `body` 스타일을 Tailwind 또는 CSS 변수로 유지합니다.

- `--ledger-bg`, `--ledger-surface`, `--ledger-border`
- `--accent-var`, `--accent-respect`
- `--text-muted`, `--text-main`
- 폰트: Inter, JetBrains Mono

---

## 5. 작업 계획 체크리스트

### A. 기반 작업

- [x] **Prisma 스키마 보강**  
  Referee, MatchReferee, User 도메인 모델 추가. `MatchStatus`(SCHEDULED/LIVE/FINISHED), `RefereeRole` enum. Round `isCurrent` 유지, Match `status` → enum 적용. `prisma generate` 완료.
- [ ] **DB 시드**  
  리그/라운드/팀/경기/심판 등 참조 데이터 시드 스크립트.
- [ ] **Shadcn UI 도입**  
  `components/ui` 원자 컴포넌트, reference UI 디자인 토큰 반영.
- [ ] **공통 레이아웃**  
  네비게이션, 검색, 프로필, 유저 드로어(Supporting/팀·로그아웃 등) — `index.html` 구조 참고.
- [ ] **인증 준비**  
  NextAuth.js 또는 커스텀 세션; 로그인/온보딩 라우트 연동.

### B. 페이지 이전 (Reference UI → App Router)

- [ ] **홈** (`/`) — `index.html`  
  FOCUS ROUND, HOT MOMENTS, 레이아웃·드로어.
- [ ] **About** (`/about`) — `about.html`
- [ ] **Login** (`/login`) — `login.html`
- [ ] **Onboarding** (`/onboarding`) — `onboarding.html`
- [ ] **경기 목록** (`/matches`) — `matches.html`
- [ ] **경기 상세** (`/matches/[id]`) — `match_upcoming` / `match_live` / `match_finished` 상태별 UI.
- [ ] **심판 목록** (`/referees`) — `referee_list.html`
- [ ] **심판 상세** (`/referees/[id]`) — `referee.html` (통계·아카이브).
- [ ] **팀 목록** (`/teams`) — `teams.html`
- [ ] **마이페이지** (유저 드로어 또는 `/my`) — `my_information`, `my_var_moments`, `whistle_recharge` 반영.

### C. 도메인 로직

- [ ] **라운드 활성화**  
  `isCurrent` 전환, `activeBetween` 등 서버 헬퍼 (날짜·경기 일정 기준).
- [ ] **경기 상태**  
  SCHEDULED / LIVE / FINISHED enum 및 표시 로직.
- [ ] **심판 통계**  
  `lib/utils/stats.ts` (또는 `lib/services`)에서 평점·통계 계산, Prisma와 연동.
- [ ] **Server Actions**  
  판정 토론 글 작성/수정/삭제, 호각 사용 등 mutation.

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

## 6. 진행 기록

| 날짜 | 내용 |
|------|------|
| (최초) | progress.md 작성. .cursorrules + _reference_ui 기준 작업 계획 정리. |
| 2026-02-20 | Prisma 스키마 보강: MatchStatus/RefereeRole enum, Referee, MatchReferee, User 모델 추가. League–Team 관계, Round unique(leagueId, number) 등 보완. |

---

이 문서는 `_reference_ui/` 와 `.cursorrules` 가 바뀔 때마다 맞춰 갱신하는 것을 권장합니다.
