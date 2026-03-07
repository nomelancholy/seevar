# AdSense·도메인·SSL 점검 체크리스트

배포 후 확인용 요약입니다.

## 1. HTTPS·SSL

- **코드**: `app/layout.tsx`에서 `NEXT_PUBLIC_SITE_URL` 기본값이 `https://seevar.online`로 설정되어 있음.
- **HSTS**: `next.config.ts`에 `Strict-Transport-Security` 헤더 추가됨. HTTPS로 접속 시 브라우저가 이후 요청도 HTTPS로 보내도록 유도.
- **실제 HTTPS 제공**: Vercel·DigitalOcean 등 호스팅 측에서 HTTPS(SSL)가 활성화되어 있어야 함. 도메인 연결 시 자동 발급되는 경우가 많음.
- **점검 방법**: 브라우저에서 `http://seevar.online`으로 접속해 `https://`로 리다이렉트되는지 확인. 주소창 자물쇠 아이콘으로 HTTPS 여부 확인.

## 2. 사이트 제목 일관성

- **루트**: `app/layout.tsx`의 `metadata.title` = `"SEE VAR"` (기본).
- **하위 페이지**: 대부분 `title: "페이지명 | SEE VAR"` 형태로 통일됨 (로그인, 이용약관, 개인정보처리방침, About, 경기 기록, 공지, 팀/심판 등).
- **동적 페이지**: 경기 상세, 심판 상세, 공지 상세 등은 `"콘텐츠명 | SEE VAR"` 또는 `"콘텐츠명 | 공지 | SEE VAR"` 형식 사용.
- **점검**: 각 주요 진입 경로(/, /about, /matches, /notice, /privacy, /terms)에서 브라우저 탭 제목에 "SEE VAR"가 포함되는지 확인.

## 3. 로고·브랜딩

- **텍스트 로고**: `SiteNav`에서 "SEE VAR" (VAR는 primary 색상)로 일관 표기. 데스크톱·모바일 메뉴 모두 동일.
- **파비콘**: `app/` 또는 `public/`에 `favicon.ico` 또는 `icon.png`가 없음. 추가 시 브랜딩·신뢰도에 도움됨.
- **OG 이미지**: `metadata.openGraph.images`에 `/assets/preview_image.png` 지정됨. SNS 공유 시 사용.

## 4. 정책·연락처 (가입·푸터)

- **푸터**: 개인정보 처리 방침·이용약관 링크 + 문의 이메일(takeknowledge@naver.com) 노출.
- **로그인**: "이용약관·개인정보 처리 방침에 동의" 문구 + 전문 보기 링크(/terms, /privacy).
- **온보딩**: "가입 시 동의한 정책" + 이용약관·개인정보 처리 방침 링크.

이 문서는 점검용 참고이며, 배포 환경에 따라 호스팅 설정을 별도 확인하세요.
