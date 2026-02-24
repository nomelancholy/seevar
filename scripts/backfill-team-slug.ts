/**
 * Team.slug가 비어 있는 행을 emblemPath에서 추출해 채웁니다.
 * 예: /assets/emblem/2026/kleague1/incheon_united_fc.svg → slug = kleague1-incheon_united_fc
 * 실행: npx tsx scripts/backfill-team-slug.ts
 */
import "../lib/database-url"
import { prisma } from "../lib/prisma"

const EMBLEM_PATH_REGEX = /^\/assets\/emblem\/\d+\/(kleague1|kleague2)\/(.+)\.svg$/

async function main() {
  const teams = await prisma.team.findMany({
    where: { OR: [{ slug: null }, { slug: "" }] },
    select: { id: true, name: true, emblemPath: true },
  })

  if (teams.length === 0) {
    console.log("slug가 비어 있는 팀이 없습니다.")
    return
  }

  let updated = 0
  for (const t of teams) {
    const path = t.emblemPath ?? ""
    const match = path.match(EMBLEM_PATH_REGEX)
    if (!match) {
      console.warn(`[skip] ${t.name} (id: ${t.id}): emblemPath에서 league/파일을 추출할 수 없음: ${path}`)
      continue
    }
    const [, league, file] = match
    const slug = `${league}-${file}`
    await prisma.team.update({
      where: { id: t.id },
      data: { slug },
    })
    console.log(`[ok] ${t.name} → slug: ${slug}`)
    updated++
  }

  console.log(`\n총 ${updated}개 팀 slug 반영 완료.`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
