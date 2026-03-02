# 크론 작업 (Digital Ocean 배포)

See VAR는 **Digital Ocean** 등 자체 서버에 배포된 환경에서 아래 두 가지를 주기적으로 갱신합니다.

1. **경기 상태** (`Match.status`): SCHEDULED → LIVE → FINISHED
2. **라운드 포커스** (`Round.isFocus`): 특정 리그(예: K리그1)에서 “현재 포커스 라운드” 전환

---

## 1. 경기 상태 갱신 (SCHEDULED / LIVE / FINISHED)

경기 일시(`playedAt`) 기준으로 DB의 `Match.status`를 갱신합니다.

- **크론 주기**: 15분마다 한 번 호출 (`*/15 * * * *`).
- **실제 갱신 시점**: **경기가 있는 날**에만, **가장 이른 경기 3시간 전 ~ 가장 늦은 경기 3시간 후** 구간 안에서만 DB를 갱신합니다. 그 구간 밖이거나 그날 경기가 없으면 스킵합니다.
- 따라서 24시간 내내 부하가 나지 않고, 경기일·경기 시간대에만 갱신이 일어납니다.

---

## 2. 라운드 isFocus 갱신

같은 리그(시즌·리그 단위) 안에서:

- **포커스 유지**: “다음 라운드”의 **가장 이른 경기 날짜 전날**까지는 **현재 라운드**가 `isFocus: true`.
- **포커스 전환**: 다음 라운드의 **가장 이른 경기 날짜 당일**이 되면, 이전 라운드는 `isFocus: false`, 다음 라운드는 `isFocus: true`로 갱신.

예: 1라운드가 포커스일 때, 2라운드의 첫 경기 날짜가 3월 1일이면, **3월 1일 당일**에 1라운드 `isFocus: false`, 2라운드 `isFocus: true`로 전환됩니다.  
모든 리그에 대해 위 규칙으로 일괄 갱신합니다.

---

## 3. 실행 방법 (Digital Ocean 권장)

서버에서 **DB에 직접 접속**해 갱신하므로, Next 앱이 반드시 떠 있을 필요는 없습니다.

### 한 번에 둘 다 실행 (권장)

`npm run cron:match-status` 한 번으로 **경기 상태**와 **라운드 isFocus**를 모두 갱신합니다.

```bash
# 프로젝트 루트에서, DATABASE_URL(.env) 설정 후
npm run cron:match-status
```

### 수동으로 각각만 실행

```bash
# 경기 상태만
npm run cron:match-status   # 내부에서 경기 상태 + isFocus 둘 다 수행

# 라운드 isFocus만
npm run cron:round-focus
```

`cron:match-status`가 이미 경기 상태와 isFocus를 같이 돌리므로, 크론에는 **`cron:match-status` 하나만** 걸어두면 됩니다.

---

## 4. 시스템 크론 설정 (crontab)

Digital Ocean Droplet 등에서 15분마다 실행하려면:

```bash
# 스크립트 실행 권한
chmod +x scripts/cron-update-match-status.sh

# crontab 편집
crontab -e
```

다음 한 줄 추가 (경로를 실제 프로젝트 루트로 변경):

```cron
*/15 * * * * /path/to/seevar/scripts/cron-update-match-status.sh >> /var/log/seevar-cron.log 2>&1
```

- `/path/to/seevar`를 실제 앱 루트 경로로 바꾸세요.
- 서버에 Node/tsx가 설치돼 있고, 프로젝트에서 `DATABASE_URL`(또는 `.env`)이 적용되도록 해 두세요.

---

## 5. HTTP API로 호출 (선택)

앱이 떠 있는 상태에서, 외부 스케줄러가 HTTP로 호출하는 방식도 가능합니다.  
(예: cron-job.org, AWS EventBridge 등)

- **경기 상태 갱신 API**: `POST https://<your-domain>/api/cron/update-match-status`
- **인증**: 환경 변수 `CRON_SECRET` 설정 시  
  - `Authorization: Bearer <CRON_SECRET>`  
  - 또는 헤더 `x-cron-secret: <CRON_SECRET>`

예 (curl):

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/update-match-status
```

**참고**: 현재 HTTP 엔드포인트는 **경기 상태** 갱신만 수행합니다. **라운드 isFocus**까지 반영하려면 서버에서 `npm run cron:match-status`(또는 `scripts/cron-update-match-status.sh`)를 크론으로 돌리는 방식을 권장합니다.

---

## 6. Vercel에 배포하는 경우

Vercel에 배포할 때는 [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)를 사용할 수 있습니다.  
이 경우에도 **라운드 isFocus**는 위 API만으로는 갱신되지 않으므로, 필요 시 Vercel 외부 스케줄러에서 `npm run cron:match-status`를 실행하는 서버를 두거나, 별도 API를 추가해야 합니다.
