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
- DB·시드·Round 포커스 등: `progress.md` §6 데이터 소스
