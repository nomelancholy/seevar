# See VAR — 작업 계획 (Progress)

`.cursorrules` 및 프로젝트 개요를 바탕으로 한 개발 로드맵입니다.

---

## 1. 프로젝트 기반 구축

- [ ] **Rails 8 프로젝트 초기화**
  - Rails 8.0+ 생성, PostgreSQL 설정
  - Solid Cache / Solid Queue 설정
- [ ] **인증 시스템**
  - `rails generate authentication` 적용
  - 네이버 소셜 로그인 연동 (uid, provider 안전 관리)
- [ ] **프론트엔드 기반**
  - Tailwind CSS, Hotwire(Turbo/Stimulus) 설정
  - ViewComponent 도입
  - `_reference_ui` 디자인 시스템 참고 및 공통 컴포넌트 정리

---

## 2. 라운드·경기 라이프사이클

- [ ] **라운드 모델 및 관리**
  - 한 시점에 하나의 라운드만 `is_current: true`
  - `start_at` / `end_at` 기준으로 `Date.today` 기반 자동 전환 로직 (Service Object)
- [ ] **경기(Match) 모델**
  - 상태: `Scheduled` → `Live` → `Finished`
  - 라운드와 연관, `archived` 스코프로 종료 라운드 경기 조회
- [ ] **경기 종료 트리거**
  - `Finished` 전환 시 심판 데이터 수집 및 평점 시스템 활성화

---

## 3. 심판 데이터·아카이브

- [ ] **심판(Referee) 모델**
  - 경기별 배정 역할(주심/부심/VAR/AVAR/대기심) 및 기록
- [ ] **심판 통계·프로필**
  - 시즌/라운드별 배정 통계, 팀별 상성 데이터
  - N+1 방지 `.includes` 적용, 자주 쓰는 조회는 Solid Cache 검토
- [ ] **심판 평점 시스템**
  - 경기 종료 후 유저 평점 저장 및 심판 프로필/아카이브와 연동

---

## 4. 순간(Moment)·커뮤니티

- [ ] **Moment(논의 순간) 모델**
  - 경기·라운드와 연관, 특정 시간대/장면 단위 토론
- [ ] **게시글·댓글**
  - 순간별 게시글/댓글 CRUD, 팀/유저 연동
- [ ] **Agree / Disagree / 신고**
  - 그린/옐로/레드 카드 UI 반영 (이미 reference UI에 반영된 부분 유지)
  - 신고 누적 시 Clean Bot 로직과 연동 (아래 6절)

---

## 5. AI 판정 분석 (See VAR)

- [ ] **`Ai::DecisionAnalysisService`**
  - `documents/Laws of the Game.pdf`(IFAB 규정) 참조
  - Gemini API(Flash 2.0/Pro) 호출, IFAB 규정 번호(예: Law 12.1) 및 반칙 카테고리 명시
- [ ] **요청·결과 저장**
  - 호각(Whistle) 차감 로직, 분석 요청/결과 모델 및 연동
- [ ] **비동기 처리**
  - AI 분석은 Solid Queue로 백그라운드 처리

---

## 6. 커뮤니티 중재 (Clean Bot)

- [ ] **`Comments::Moderator` 서비스**
  - 댓글/게시글 저장 전 Gemini 호출로 독성·비난 검문
  - IFAB 규정 인용 논리적 비판은 허용, 단순 비난 차단
- [ ] **신고·숨김**
  - 누적 신고 5회 시 해당 콘텐츠 `hidden: true` 자동 처리

---

## 7. 성능·보안·운영

- [ ] **캐싱**
  - 자주 조회되는 경기 일정·심판 통계 Solid Cache 적용
- [ ] **DB**
  - JSONB, Full-text search 활용 시 스키마·인덱스 설계
  - 스키마 변경은 Migration 전용
- [ ] **대량·외부 작업**
  - 스크래핑, 대량 메일 등은 Solid Queue로 비동기 처리

---

## 8. 참고 규칙 요약

| 항목 | 규칙 |
|------|------|
| 아키텍처 | Fat Model, Skinny Controller; 비즈니스 로직은 `app/services` Service Object |
| 명명 | 클래스/모듈 `CamelCase`, 메서드/변수/파일 `snake_case` |
| DB | N+1 방지 `.includes` 필수, 스키마는 Migration만 사용 |
| UI | `_reference_ui` 폴더 최우선 참고, 디자인 시스템 일관 유지 |
| AI 답변 | IFAB 규정 번호·반칙 카테고리 명시, 객관적 K리그 VAR 분석관 톤 |

---

**다음 단계 제안:**  
가장 먼저 **라운드 자동 전환**, **AI 판정 분석 서비스**, **심판 아카이브** 중 하나를 골라 구현을 시작하면 됩니다.
