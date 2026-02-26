/**
 * 경기 상태 + 라운드 isFocus 일괄 갱신 스크립트.
 * - 경기 상태: 경기가 있는 날의 [가장 이른 경기 3h 전 ~ 가장 늦은 경기 3h 후] 구간에서만 갱신.
 * - 라운드 focus: 매번 실행. 같은 리그에서 "다음 라운드 경기 전날"까지 현재 라운드 focus, 그 다음날부터 다음 라운드로 전환.
 * 예: npx tsx scripts/run-update-match-status.ts
 */
import { prisma } from "../lib/prisma"
import { isWithinMatchUpdateWindow, updateMatchStatusBatch } from "../lib/jobs/update-match-status"
import { updateRoundFocusBatch } from "../lib/jobs/update-round-focus"

async function main() {
  const now = new Date()
  const inWindow = await isWithinMatchUpdateWindow(prisma, now)
  if (inWindow) {
    const { updated } = await updateMatchStatusBatch(prisma)
    console.log(`Match status updated: ${updated}`)
  } else {
    console.log("Outside match update window (no matches today or outside 3h window), skipping match status.")
  }
  const { updated: roundUpdated } = await updateRoundFocusBatch(prisma, now)
  console.log(`Round isFocus updated: ${roundUpdated}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
