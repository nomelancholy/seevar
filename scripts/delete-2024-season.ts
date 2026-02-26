/**
 * 2024 시즌 전체 삭제.
 * 사용: npx tsx scripts/delete-2024-season.ts
 */
import { prisma } from "../lib/prisma"

async function main() {
  const season = await prisma.season.findUnique({
    where: { year: 2024 },
    select: { id: true, year: true },
  })
  if (!season) {
    console.log("2024 시즌이 없습니다.")
    await prisma.$disconnect()
    return
  }

  const leagues = await prisma.league.findMany({
    where: { seasonId: season.id },
    select: { id: true, name: true, slug: true },
  })
  const leagueIds = leagues.map((l) => l.id)
  const rounds = await prisma.round.findMany({
    where: { leagueId: { in: leagueIds } },
    select: { id: true },
  })
  const roundIds = rounds.map((r) => r.id)
  const matches = await prisma.match.findMany({
    where: { roundId: { in: roundIds } },
    select: { id: true },
  })
  const matchIds = matches.map((m) => m.id)

  const moments = await prisma.moment.findMany({
    where: { matchId: { in: matchIds } },
    select: { id: true },
  })
  const momentIds = moments.map((m) => m.id)
  const comments = await prisma.comment.findMany({
    where: { momentId: { in: momentIds } },
    select: { id: true },
  })
  const commentIds = comments.map((c) => c.id)

  console.log(`2024 시즌 삭제: 리그 ${leagues.length}개, 라운드 ${rounds.length}개, 경기 ${matches.length}개, 모멘트 ${momentIds.length}개`)

  for (const lid of leagueIds) {
    await prisma.league.update({
      where: { id: lid },
      data: { teams: { set: [] } },
    })
  }

  await prisma.$transaction([
    prisma.report.deleteMany({ where: { commentId: { in: commentIds } } }),
    prisma.reaction.deleteMany({
      where: {
        OR: [{ momentId: { in: momentIds } }, { commentId: { in: commentIds } }],
      },
    }),
    prisma.comment.deleteMany({ where: { momentId: { in: momentIds } } }),
    prisma.moment.deleteMany({ where: { matchId: { in: matchIds } } }),
    prisma.refereeReview.deleteMany({ where: { matchId: { in: matchIds } } }),
    prisma.matchReferee.deleteMany({ where: { matchId: { in: matchIds } } }),
    prisma.match.deleteMany({ where: { id: { in: matchIds } } }),
    prisma.round.deleteMany({ where: { id: { in: roundIds } } }),
    prisma.refereeStats.deleteMany({ where: { leagueId: { in: leagueIds } } }),
    prisma.league.deleteMany({ where: { id: { in: leagueIds } } }),
    prisma.season.delete({ where: { id: season.id } }),
  ])

  console.log("2024 시즌 삭제 완료.")
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
