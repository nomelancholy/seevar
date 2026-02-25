# 경기 상태 크론 (SCHEDULED / LIVE / FINISHED 갱신)

경기 일시(`playedAt`) 기준으로 DB의 `Match.status`를 갱신합니다.

## 동작 방식

- **크론 트리거**: 15분마다 한 번 호출하면 됩니다 (crontab `*/15 * * * *` 또는 외부 스케줄러).
- **실제 갱신 시점**: **경기가 있는 날**에만, **가장 이른 경기 3시간 전 ~ 가장 늦은 경기 3시간 후** 구간 안에서만 DB를 갱신합니다. 그 구간 밖이거나 그날 경기가 없으면 스킵(무시)합니다.
- 따라서 24시간 15분마다 돌 필요 없이, 경기일·경기 시간대에만 부하가 발생합니다.

**Vercel Cron은 Vercel에 배포했을 때만 동작합니다.** AWS, DigitalOcean 등 다른 호스트로 이전하면 아래 방식으로 스케줄을 설정해야 합니다.

---

## 1. 스크립트 + 시스템 크론 (권장 — AWS EC2, DigitalOcean Droplet 등)

서버에서 **DB에 직접 접속**해 갱신하므로, 앱이 반드시 떠 있을 필요가 없습니다.

### 1) 수동 실행 테스트

```bash
# 프로젝트 루트에서, DATABASE_URL(또는 .env) 설정 후
npm run cron:match-status
```

### 2) 15분마다 실행 (crontab)

```bash
# 스크립트 실행 권한
chmod +x scripts/cron-update-match-status.sh

# crontab 편집
crontab -e

# 다음 한 줄 추가 (경로는 실제 프로젝트 루트로 변경)
*/15 * * * * /path/to/seevar/scripts/cron-update-match-status.sh >> /var/log/seevar-cron.log 2>&1
```

- `/path/to/seevar`를 실제 앱 루트 경로로 바꾸세요.
- 서버에 Node/tsx가 설치돼 있고, 프로젝트에서 `DATABASE_URL`(또는 `.env`)이 적용되도록 해 두세요.

---

## 2. HTTP API 호출 (외부 스케줄러)

앱이 배포된 **URL**에 15분마다 POST 요청을 보내는 방식입니다.  
(예: cron-job.org, AWS EventBridge + Lambda, GitHub Actions scheduled workflow 등)

- **URL**: `POST https://<your-domain>/api/cron/update-match-status`
- **인증**: 환경 변수 `CRON_SECRET`을 설정한 경우  
  - `Authorization: Bearer <CRON_SECRET>`  
  - 또는 헤더 `x-cron-secret: <CRON_SECRET>`

예 (curl):

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/update-match-status
```

`CRON_SECRET`이 없으면 인증 없이도 호출 가능(보안상 비권장).

---

## 3. Vercel에 배포하는 경우

Vercel에서만 쓰는 경우, [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)를 쓰면 됩니다.

1. 프로젝트 루트에 `vercel.json` 추가:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-match-status",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

2. Vercel 대시보드에서 환경 변수 `CRON_SECRET` 설정 (선택, 보안 권장).

Vercel이 15분마다 위 path로 요청을 보내며, 설정한 경우 `CRON_SECRET`을 Bearer로 붙여 줍니다.
