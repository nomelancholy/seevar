/**
 * Referee.slug를 이름 기반 영문 슬러그로 일괄 수정.
 * 동명이인은 go-minguk, go-minguk-1, go-minguk-2 형태로 구분.
 * 실행: npx tsx scripts/backfill-referee-slug.ts
 */

import { prisma } from "@/lib/prisma"
import { makeUniqueRefereeSlug } from "@/lib/referee-slug"

async function main() {
  const referees = await prisma.referee.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  })
  if (referees.length === 0) {
    console.log("심판이 없습니다.")
    return
  }

  const used = new Set<string>()
  let updated = 0
  for (const r of referees) {
    const newSlug = makeUniqueRefereeSlug(r.name, used)
    used.add(newSlug)
    if (newSlug !== r.slug) {
      await prisma.referee.update({
        where: { id: r.id },
        data: { slug: newSlug },
      })
      console.log(`[ok] ${r.name} ${r.slug} → ${newSlug}`)
      updated++
    }
  }
  console.log(`\n총 ${referees.length}명 중 ${updated}명 슬러그 반영 완료.`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
