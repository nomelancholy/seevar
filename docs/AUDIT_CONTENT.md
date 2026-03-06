# 기존 글·닉네임 검수 (Audit)

필터 규칙이 추가·강화되기 전에 작성된 **기존 댓글, 한줄평, 닉네임** 등을 한 번씩 검수할 때 사용하는 스크립트와 보고서 해석 방법입니다.

---

## 1. 검수 대상

| 대상 | 검사 방식 | 비고 |
|------|------------|------|
| **닉네임** (`User.name`) | `validateDisplayName` (금칙어 + OpenAI Moderation) | API 호출 있음 → 요청 간 400ms 지연 |
| **댓글** (`Comment.content`) | `checkProfanity` (자체 금칙어) | |
| **심판 한줄평** (`RefereeReview.comment`) | `checkProfanity` | |
| **한줄평 답글** (`RefereeReviewReply.content`) | `checkProfanity` | DB에 status 없음 → **보고만** |
| **모멘트** (`Moment.title` / `description`) | `checkProfanity` | DB에 status 없음 → **보고만** |

---

## 2. 실행 방법

프로젝트 루트에서 `.env`(또는 `DATABASE_URL`)가 설정된 상태로 실행합니다.  
닉네임 검사 시 **OPENAI_API_KEY**가 필요합니다.

```bash
# 검수만 수행, 결과를 stdout + 기본 보고서 파일(audit-report-YYYY-MM-DD.json)로 저장
npm run audit:content

# 보고서 파일 경로 지정
npx tsx scripts/audit-content.ts --export=./reports/audit-2026-03.json

# 위반 댓글·한줄평만 DB에 반영 (UNDER_REVIEW + filterReason 설정)
npx tsx scripts/audit-content.ts --apply

# 닉네임 검사 생략 (OpenAI 호출 없이 빠르게)
npx tsx scripts/audit-content.ts --no-nicknames

# 글만 검사 (닉네임 생략)
npx tsx scripts/audit-content.ts --no-content
```

### 닉네임만 검사

**닉네임만** 검사할 때는 `--no-content`를 쓰면 됩니다. 위반 시 보고서에만 올리고, DB는 건드리지 않습니다.

```bash
# 닉네임만 검사 (보고서만 생성)
npm run audit:nicknames
# 또는
npx tsx scripts/audit-content.ts --no-content
```

**닉네임 위반 시 자동 변경**까지 하려면 `--rename-nicknames`를 추가합니다.  
위반한 유저의 닉네임을 **케이리그화이팅1**, **케이리그화이팅2**, **케이리그화이팅3** … 순으로 DB에 일괄 변경합니다. (이미 존재하는 번호 다음부터 부여)

```bash
# 닉네임만 검사 + 위반 시 케이리그화이팅1, 2, 3... 으로 변경
npx tsx scripts/audit-content.ts --no-content --rename-nicknames
```

---

## 3. 보고서 구조

`audit-report-YYYY-MM-DD.json` (또는 `--export`로 지정한 경로)에는 다음이 들어갑니다.

- **at**: 검수 실행 시각 (ISO 문자열)
- **summary**: 종류별 위반 건수 (`nicknames`, `comments`, `reviews`, `replies`, `moments`).  
  닉네임 자동 변경을 했으면 `nicknamesRenamed`도 포함됨.
- **nicknames** / **comments** / **reviews** / **replies** / **moments**: 위반 항목 배열  
  - 각 항목: `id`, `preview`(앞 80자), `reason`, `link`(있으면 화면 링크)

이 파일을 바탕으로:

- **닉네임 위반**: `--rename-nicknames` 사용 시 **케이리그화이팅1, 2, 3…** 으로 DB 일괄 변경됨. 사용하지 않으면 보고서만 보고 운영자가 안내 또는 수동 변경.
- 댓글/한줄평: `--apply` 사용 시 이미 `UNDER_REVIEW` 처리됨. 추가로 신고 처리·숨김 등 정책 적용 가능.
- 한줄평 답글·모멘트: 스키마에 상태 필드가 없으므로 보고서만 보고 수동 조치(삭제/수정 요청 등) 검토.

---

## 4. 권장 흐름

1. **최초 1회**: `npm run audit:content`로 전체 검수 후 `audit-report-*.json` 확인
2. **필요 시**: `--apply`로 댓글·한줄평만 일괄 `UNDER_REVIEW` 처리
3. **닉네임**: 보고서의 `nicknames` 목록을 보고 개별 안내 또는 정책에 따라 조치
4. **정책/금칙어 변경 후**: 주기적으로 `audit:content` 재실행해 재검수

---

## 5. 서버에서 실행하기

### 방법 A: 서버에 SSH 접속 후 직접 실행

배포 서버(Digital Ocean 등)에 SSH로 들어간 뒤, 앱 디렉터리에서 실행합니다.  
보고서 파일은 **실행한 디렉터리**(보통 앱 루트)에 `audit-report-YYYY-MM-DD.json`으로 생성됩니다.

```bash
# 서버에 접속 후
cd /path/to/seevar   # 실제 앱 루트 경로로 변경
npm run audit:content
# 필요하면 보고서 다운로드: scp user@server:/path/to/seevar/audit-report-*.json ./
```

`.env`(또는 `DATABASE_URL`, 닉네임 검사 시 `OPENAI_API_KEY`)가 서버에 설정돼 있어야 합니다.

### 방법 B: HTTP API로 실행 (SSH 없이)

앱이 떠 있는 서버라면 **HTTP로 검수를 돌리고** 결과를 JSON으로 받을 수 있습니다.  
로컬 PC에서 `curl`로 호출해 보고서를 파일로 저장하면 됩니다. 서버에 들어갈 필요 없습니다.

- **검수만** (GET 또는 POST, body 없음):  
  `GET https://<도메인>/api/cron/audit-content`
- **옵션 지정** (POST, JSON body):  
  `POST /api/cron/audit-content`  
  body 예: `{ "apply": true }`, `{ "skipNicknames": true }`, `{ "skipContent": true, "renameViolatingNicknames": true }` (닉네임만 검사 + 위반 시 케이리그화이팅1,2,3… 변경) 등

서버에 `CRON_SECRET` 환경 변수를 설정해 두었다면, 요청 시 인증을 넣어야 합니다.

```bash
# 로컬에서 실행 — 검수만 하고 결과를 파일로 저장
curl -s -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/audit-content \
  -o audit-report.json

# 위반 댓글·한줄평까지 DB에 반영하려면 (POST + apply)
curl -s -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"apply":true}' \
  https://your-domain.com/api/cron/audit-content \
  -o audit-report.json

# 닉네임만 검사하고 위반 시 케이리그화이팅1,2,3... 으로 변경
curl -s -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"skipContent":true,"renameViolatingNicknames":true}' \
  https://your-domain.com/api/cron/audit-content \
  -o audit-report.json
```

`CRON_SECRET`을 설정하지 않으면 인증 없이도 호출 가능하므로, **프로덕션에서는 반드시 설정**하는 것을 권장합니다.

### (선택) 서버 크론으로 주기 실행

서버에서 주기적으로 검수만 돌리고 보고서를 고정 경로에 남기려면, 셸 스크립트와 crontab을 쓸 수 있습니다.

```bash
# scripts/cron-audit-content.sh (예시)
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
export NODE_ENV="${NODE_ENV:-production}"
npx tsx scripts/audit-content.ts --export=/var/reports/seevar/audit-report.json
```

```cron
# 매주 일요일 새벽 3시에 검수만 실행 (apply 없음)
0 3 * * 0 /path/to/seevar/scripts/cron-audit-content.sh >> /var/log/seevar-audit.log 2>&1
```
