# _reference_ui — See VAR 디자인 참고

정적 HTML 목업으로, 앱 UI 디자인·토큰·패턴 참고용입니다.  
Rails 앱에서는 Tailwind + ViewComponent로 동일한 디자인을 적용합니다.

## 디자인 토큰 (CSS 변수)

| 변수 | 용도 | 다크 기본값 |
|------|------|-------------|
| `--ledger-bg` | 배경 | `#0d0e10` |
| `--ledger-surface` | 카드/패널 배경 | `#16181c` |
| `--ledger-border` | 테두리 | `#2d3139` |
| `--accent-var` | VAR 포인트 컬러 | `#00ff41` |
| `--accent-respect` | Respect 포인트 컬러 | `#3b82f6` |
| `--text-main` | 본문 텍스트 | `#ffffff` |
| `--text-muted` | 보조 텍스트 | `#8b949e` |

라이트 모드: `body.light-mode` 시 위 변수들이 밝은 값으로 전환됩니다.

## 공통 클래스

- **`.ledger-surface`** — 카드/패널 (border + shadow)
- **`.btn-structural`** — 버튼 기본 (border, hover 시 살짝 올라감)
- **`.font-mono`** / **`.mono`** — JetBrains Mono
- **`.menu-link`** — 하단 accent 언더라인 링크
- **`.league-tab`** / **`.league-tab.active`** — 탭 (리그 등)
- **`.match-card-mini`** — 미니 경기 카드
- **`.no-scrollbar`** / **`.custom-scrollbar`** — 스크롤바 숨김/커스텀

## 파일 목록

- `index.html` — 메인·경기 슬라이더·리그 접기
- `match_live.html` / `match_upcoming.html` / `match_finished.html` — 경기 상태별
- `matches.html` — 경기 목록
- `teams.html` — 팀
- `login.html` / `onboarding.html` — 로그인·온보딩
- `referee.html` / `referee_list.html` — 심판
- `my_var_moments.html` / `my_information.html` — 마이
- `supporters.html` / `about.html` / `whistle_recharge.html` — 기타

## 앱에서 사용

- **Tailwind**: `app/assets/stylesheets/application.tailwind.css`에 동일 토큰 정의
- **ViewComponent**: `app/components/` — `ButtonComponent`, `CardComponent` 등이 ledger 토큰 사용
- 새 컴포넌트 추가 시 위 토큰·클래스명을 맞추면 _reference_ui와 시각적으로 일치합니다.
