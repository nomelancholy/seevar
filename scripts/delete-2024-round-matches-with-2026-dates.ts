/**
 * 2024 시즌 소속 라운드에 있으면서 playedAt이 2026년인 경기(잘못 들어간 데이터) 삭제.
 * 사용: npx tsx scripts/delete-2024-round-matches-with-2026-dates.ts
 */
import { prisma } from "../lib/prisma"

async function main() {
  const season2024 = await prisma.season.findUnique({
    where: { year: 2024 },
    select: { id: true },
  })
  if (!season2024) {
    console.log("2024 시즌이 없습니다.")
    await prisma.$disconnect()
    return
  }

  const leagues = await prisma.league.findMany({
    where: { seasonId: season2024.id },
    select: { id: true },
  })
  const leagueIds = leagues.map((l) => l.id)
  const rounds = await prisma.round.findMany({
    where: { leagueId: { in: leagueIds } },
    select: { id: true },
  })
  const roundIds = rounds.map((r) => r.id)

  const start2026 = new Date("2026-01-01T00:00:00.000Z")
  const end2026 = new Date("2026-12-31T23:59:59.999Z")

  const matches = await prisma.match.findMany({
    where: {
      roundId: { in: roundIds },
      playedAt: { gte: start2026, lte: end2026 },
    },
    select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, playedAt: true },
  })

  if (matches.length === 0) {
    console.log("2024 시즌 라운드 중 playedAt이 2026년인 경기가 없습니다.")
    await prisma.$disconnect()
    return
  }

  console.log(`삭제 대상: ${matches.length}건`)
  matches.forEach((m) => {
    console.log(`  - ${m.homeTeam.name} vs ${m.awayTeam.name} (${m.playedAt?.toISOString().slice(0, 10)})`)
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
  ])

  console.log(`삭제 완료: ${matchIds.length}경기 (관련 모멘트·댓글·리뷰·배정 포함)`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
