/**
 * 라운드 isFocus 일괄 갱신.
 * 같은 리그 내에서 "다음 라운드 경기 전날"까지 현재 라운드가 focus, 그 다음날부터 다음 라운드가 focus.
 * 예: npx tsx scripts/run-update-round-focus.ts
 */
import { prisma } from "../lib/prisma"
import { updateRoundFocusBatch } from "../lib/jobs/update-round-focus"

async function main() {
  const { updated } = await updateRoundFocusBatch(prisma)
  console.log(`Round isFocus updated: ${updated}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
