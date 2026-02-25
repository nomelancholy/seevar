/**
 * 경기 상태 일괄 갱신 스크립트.
 * 크론은 15분마다 돌리면 되고, 경기가 있는 날의 [가장 이른 경기 3h 전 ~ 가장 늦은 경기 3h 후] 구간에서만 실제 갱신 수행.
 * 예: npx tsx scripts/run-update-match-status.ts
 */
import { prisma } from "../lib/prisma"
import { isWithinMatchUpdateWindow, updateMatchStatusBatch } from "../lib/jobs/update-match-status"

async function main() {
  const now = new Date()
  const inWindow = await isWithinMatchUpdateWindow(prisma, now)
  if (!inWindow) {
    console.log("Outside match update window (no matches today or outside 3h window), skipping.")
    await prisma.$disconnect()
    return
  }
  const { updated } = await updateMatchStatusBatch(prisma)
  console.log(`Match status updated: ${updated}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
