# See VAR — 작업 계획 (Progress)

`.cursorrules` 및 프로젝트 개요를 바탕으로 한 개발 로드맵입니다.

**진행 순서:** 1 기반 구축 → **2 페이지 UI** (_reference_ui 참고) → **3 DB 스키마** (UI 기반 설계) → 4~ **세부 기능** 붙이기.

---

## 1. 프로젝트 기반 구축

- [x] **Rails 8 프로젝트 초기화**
  - Rails 8.0+ 생성, PostgreSQL 설정 (`config/database.yml`)
  - Solid Cache / Solid Queue 설정 (`config/cache.yml`, `config/queue.yml`, `db/cache_schema.rb`, `db/queue_schema.rb`)
  - PostgreSQL Docker 구성 (`docker-compose.yml` — `db` 서비스, Postgres 16 Alpine, 포트 5432)
  - **로컬 DB 사용:** `.env`에 `DB_PASSWORD` 설정 후 `docker compose up db -d` → `bundle exec rails db:create` → `bundle exec rails db:prepare`

- [x] **프론트엔드 기반**
  - Tailwind CSS 설정 (`tailwindcss-rails`, `app/assets/stylesheets/application.tailwind.css`, `config/tailwind.config.js`) — _reference_ui 디자인 토큰 반영
  - Hotwire: Turbo (importmap + application.js), Stimulus 유지
  - ViewComponent 도입 (`app/components/ApplicationComponent`, `ButtonComponent`, `CardComponent`)
  - `_reference_ui` 정리: `_reference_ui/README.md`에 토큰·클래스·파일 목록 문서화
  - **로컬:** `bundle exec rails tailwindcss:watch` 또는 `./bin/dev` (Rails + Tailwind watch)

- [ ] **인증 시스템**
  - `rails generate authentication` 적용
  - 네이버 소셜 로그인 연동 (uid, provider 안전 관리)

---

## 2. 페이지 UI 그리기 (_reference_ui 참고)

**목표:** 화면·라우트·레이아웃을 먼저 만든다. 데이터는 목업/하드코딩. DB는 나중에.

- [ ] **메인·경기**
  - `_reference_ui/index.html` 참고 — 메인, 경기 슬라이더, 리그 탭/접기
  - `_reference_ui/matches.html`, `match_upcoming.html`, `match_live.html`, `match_finished.html` — 경기 목록·상세·상태별 UI
- [ ] **팀·심판**
  - `teams.html` — 팀 목록/상세
  - `referee_list.html`, `referee.html` — 심판 목록·프로필
- [ ] **로그인·온보딩·마이**
  - `login.html`, `onboarding.html` — 로그인·온보딩
  - `my_information.html`, `my_var_moments.html` — 마이페이지·내 순간
- [ ] **순간·커뮤니티·기타**
  - Moment/게시글·댓글 UI (reference 내 해당 목업 참고)
  - `supporters.html`, `about.html`, `whistle_recharge.html` — 서포터즈·소개·호각 충전

구현: 라우트·컨트롤러·뷰·ViewComponent만 추가. 공통 레이아웃·네비게이션은 _reference_ui 스타일 유지.

---

## 3. DB 스키마 설계 (UI 기반)

**목표:** 2에서 그린 화면에서 쓰는 데이터 구조를 정리해 모델·마이그레이션으로 만든다. 비즈니스 로직은 최소만.

- [ ] **엔티티 정리**
  - UI별로 필요한 도메인 정리 (라운드, 경기, 팀, 심판, 유저, Moment, 게시글·댓글, 호각 등)
- [ ] **마이그레이션 작성**
  - 테이블·컬럼·인덱스·연관 관계 정의. 스키마 변경은 Migration 전용.
- [ ] **뷰와 모델 연결**
  - 기존 목업 화면을 실제 DB 조회로 전환 (CRUD 기본만, 세부 규칙은 4~에서)

---

## 4. 라운드·경기 라이프사이클 (세부 기능)

- [ ] **라운드 모델 및 관리**
  - 한 시점에 하나의 라운드만 `is_current: true`
  - `start_at` / `end_at` 기준으로 `Date.today` 기반 자동 전환 로직 (Service Object)
- [ ] **경기(Match) 모델**
  - 상태: `Scheduled` → `Live` → `Finished`
  - 라운드와 연관, `archived` 스코프로 종료 라운드 경기 조회
- [ ] **경기 종료 트리거**
  - `Finished` 전환 시 심판 데이터 수집 및 평점 시스템 활성화

---

## 5. 심판 데이터·아카이브 (세부 기능)

- [ ] **심판(Referee) 모델**
  - 경기별 배정 역할(주심/부심/VAR/AVAR/대기심) 및 기록
- [ ] **심판 통계·프로필**
  - 시즌/라운드별 배정 통계, 팀별 상성 데이터
  - N+1 방지 `.includes` 적용, 자주 쓰는 조회는 Solid Cache 검토
- [ ] **심판 평점 시스템**
  - 경기 종료 후 유저 평점 저장 및 심판 프로필/아카이브와 연동

---

## 6. 순간(Moment)·커뮤니티 (세부 기능)

- [ ] **Moment(논의 순간) 모델**
  - 경기·라운드와 연관, 특정 시간대/장면 단위 토론
- [ ] **게시글·댓글**
  - 순간별 게시글/댓글 CRUD, 팀/유저 연동
- [ ] **Agree / Disagree / 신고**
  - 그린/옐로/레드 카드 UI 반영 (이미 reference UI에 반영된 부분 유지)
  - 신고 누적 시 Clean Bot 로직과 연동 (아래 8절)

---

## 7. AI 판정 분석 (See VAR) (세부 기능)

- [ ] **`Ai::DecisionAnalysisService`**
  - `documents/Laws of the Game.pdf`(IFAB 규정) 참조
  - Gemini API(Flash 2.0/Pro) 호출, IFAB 규정 번호(예: Law 12.1) 및 반칙 카테고리 명시
- [ ] **요청·결과 저장**
  - 호각(Whistle) 차감 로직, 분석 요청/결과 모델 및 연동
- [ ] **비동기 처리**
  - AI 분석은 Solid Queue로 백그라운드 처리

---

## 8. 커뮤니티 중재 (Clean Bot) (세부 기능)

- [ ] **`Comments::Moderator` 서비스**
  - 댓글/게시글 저장 전 Gemini 호출로 독성·비난 검문
  - IFAB 규정 인용 논리적 비판은 허용, 단순 비난 차단
- [ ] **신고·숨김**
  - 누적 신고 5회 시 해당 콘텐츠 `hidden: true` 자동 처리

---

## 9. 성능·보안·운영

- [ ] **캐싱**
  - 자주 조회되는 경기 일정·심판 통계 Solid Cache 적용
- [ ] **DB**
  - JSONB, Full-text search 활용 시 스키마·인덱스 설계
  - 스키마 변경은 Migration 전용
- [ ] **대량·외부 작업**
  - 스크래핑, 대량 메일 등은 Solid Queue로 비동기 처리

---

## 10. 참고 규칙 요약

| 항목     | 규칙                                                                        |
| -------- | --------------------------------------------------------------------------- |
| 아키텍처 | Fat Model, Skinny Controller; 비즈니스 로직은 `app/services` Service Object |
| 명명     | 클래스/모듈 `CamelCase`, 메서드/변수/파일 `snake_case`                      |
| DB       | N+1 방지 `.includes` 필수, 스키마는 Migration만 사용                        |
| UI       | `_reference_ui` 폴더 최우선 참고, 디자인 시스템 일관 유지                   |
| AI 답변  | IFAB 규정 번호·반칙 카테고리 명시, 객관적 K리그 VAR 분석관 톤               |

---

**다음 단계 제안:**  
**2. 페이지 UI 그리기**부터 진행 — `_reference_ui`를 참고해 메인·경기·팀·심판·로그인 등 화면을 먼저 그리고, 이어서 **3. DB 스키마** 설계 후 4~ 세부 기능을 붙이면 됩니다.
