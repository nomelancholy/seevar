#!/usr/bin/env bash
# 경기 상태 + 라운드 focus 갱신 — 시스템 크론에서 호출용.
# 사용: crontab에 추가 예) */15 * * * * /path/to/seevar/scripts/cron-update-match-status.sh
# 실행 전 chmod +x scripts/cron-update-match-status.sh
set -e
cd "$(dirname "$0")/.."
export NODE_ENV="${NODE_ENV:-production}"
npx tsx scripts/run-update-match-status.ts
