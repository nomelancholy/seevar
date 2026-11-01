/**
 * RefereeStats·RefereeTeamStat을 원본(MatchReferee, RefereeReview)에서 다시 집계한다.
 * 두 테이블은 증감 방식으로 유지되는 파생값이라, 과거 버그나 수동 수정으로 어긋날 수 있다.
 * (예: 숨김 처리된 한줄평이 팀별 팬 평점에 계속 남아 있던 문제)
 *
 * 실행:
 *   npx tsx scripts/rebuild-referee-stats.ts            차이만 출력 (DB 변경 없음)
 *   npx tsx scripts/rebuild-referee-stats.ts --apply    DB에 반영
 *
 * --apply는 두 테이블을 한 트랜잭션에서 비우고 다시 채운다. 평가가 몰리는 경기 직후는 피해서 실행할 것.
 */
import type { RefereeRole } from "@prisma/client"
import { prisma } from "../lib/prisma"

const EPSILON = 1e-6

type SeasonStat = {
  refereeId: string
  seasonId: string
  leagueId: string
  role: RefereeRole
  matchCount: number
  ratingSum: number
  ratingCount: number
}

type TeamStat = {
  refereeId: string
  teamId: string
  seasonId: string
  leagueId: string
  role: RefereeRole
  totalAssignments: number
  totalYellowCards: number
  totalRedCards: number
  ratingSum: number
  ratingCount: number
}

function average(sum: number, count: number): number {
  return count > 0 ? sum / count : 0
}

async function computeExpected() {
  const [assignments, reviews] = await Promise.all([
    prisma.matchReferee.findMany({
      select: {
        refereeId: true,
        role: true,
        homeYellowCards: true,
        homeRedCards: true,
        awayYellowCards: true,
        awayRedCards: true,
        match: {
          select: {
            homeTeamId: true,
            awayTeamId: true,
            round: { select: { leagueId: true, league: { select: { seasonId: true } } } },
          },
        },
      },
    }),
    prisma.refereeReview.findMany({
      where: { status: "VISIBLE" },
      select: {
        refereeId: true,
        role: true,
        rating: true,
        fanTeamId: true,
        match: {
          select: {
            round: { select: { leagueId: true, league: { select: { seasonId: true } } } },
          },
        },
      },
    }),
  ])

  const seasonStats = new Map<string, SeasonStat>()
  const teamStats = new Map<string, TeamStat>()

  const teamStatOf = (
    refereeId: string,
    teamId: string,
    seasonId: string,
    leagueId: string,
    role: RefereeRole
  ) => {
    const key = `${refereeId}:${teamId}:${seasonId}:${leagueId}:${role}`
    let stat = teamStats.get(key)
    if (!stat) {
      stat = {
        refereeId,
        teamId,
        seasonId,
        leagueId,
        role,
        totalAssignments: 0,
        totalYellowCards: 0,
        totalRedCards: 0,
        ratingSum: 0,
        ratingCount: 0,
      }
      teamStats.set(key, stat)
    }
    return stat
  }

  for (const assignment of assignments) {
    const leagueId = assignment.match.round.leagueId
    const seasonId = assignment.match.round.league.seasonId
    const key = `${assignment.refereeId}:${seasonId}:${leagueId}:${assignment.role}`
    const seasonStat = seasonStats.get(key)
    if (seasonStat) seasonStat.matchCount += 1
    else
      seasonStats.set(key, {
        refereeId: assignment.refereeId,
        seasonId,
        leagueId,
        role: assignment.role,
        matchCount: 1,
        ratingSum: 0,
        ratingCount: 0,
      })

    const home = teamStatOf(assignment.refereeId, assignment.match.homeTeamId, seasonId, leagueId, assignment.role)
    home.totalAssignments += 1
    home.totalYellowCards += assignment.homeYellowCards
    home.totalRedCards += assignment.homeRedCards

    const away = teamStatOf(assignment.refereeId, assignment.match.awayTeamId, seasonId, leagueId, assignment.role)
    away.totalAssignments += 1
    away.totalYellowCards += assignment.awayYellowCards
    away.totalRedCards += assignment.awayRedCards
  }

  for (const review of reviews) {
    const leagueId = review.match.round.leagueId
    const seasonId = review.match.round.league.seasonId
    // RefereeStats는 배정이 있는 조합만 갖는다 (배정 없이 남은 평가는 원본 오류이므로 건너뜀)
    const seasonStat = seasonStats.get(`${review.refereeId}:${seasonId}:${leagueId}:${review.role}`)
    if (seasonStat) {
      seasonStat.ratingSum += review.rating
      seasonStat.ratingCount += 1
    }
    if (review.fanTeamId) {
      const teamStat = teamStatOf(review.refereeId, review.fanTeamId, seasonId, leagueId, review.role)
      teamStat.ratingSum += review.rating
      teamStat.ratingCount += 1
    }
  }

  return { seasonStats, teamStats }
}

async function main() {
  const apply = process.argv.includes("--apply")
  const { seasonStats, teamStats } = await computeExpected()

  const [currentSeasonStats, currentTeamStats] = await Promise.all([
    prisma.refereeStats.findMany(),
    prisma.refereeTeamStat.findMany(),
  ])

  let seasonDrift = 0
  const seenSeasonKeys = new Set<string>()
  for (const row of currentSeasonStats) {
    const key = `${row.refereeId}:${row.seasonId}:${row.leagueId}:${row.role}`
    seenSeasonKeys.add(key)
    const expected = seasonStats.get(key)
    const expectedCount = expected?.matchCount ?? 0
    const expectedAvg = expected ? average(expected.ratingSum, expected.ratingCount) : 0
    if (row.matchCount !== expectedCount || Math.abs(row.avgRating - expectedAvg) > EPSILON) {
      seasonDrift += 1
      if (seasonDrift <= 10) {
        console.log(
          `[RefereeStats] ${key} 경기 ${row.matchCount}→${expectedCount}, 평점 ${row.avgRating.toFixed(2)}→${expectedAvg.toFixed(2)}`
        )
      }
    }
  }
  const missingSeasonRows = [...seasonStats.keys()].filter((key) => !seenSeasonKeys.has(key)).length

  let teamDrift = 0
  const seenTeamKeys = new Set<string>()
  for (const row of currentTeamStats) {
    const key = `${row.refereeId}:${row.teamId}:${row.seasonId}:${row.leagueId}:${row.role}`
    seenTeamKeys.add(key)
    const expected = teamStats.get(key)
    const expectedAvg = expected ? average(expected.ratingSum, expected.ratingCount) : 0
    const differs =
      row.totalAssignments !== (expected?.totalAssignments ?? 0) ||
      row.totalYellowCards !== (expected?.totalYellowCards ?? 0) ||
      row.totalRedCards !== (expected?.totalRedCards ?? 0) ||
      row.fanRatingCount !== (expected?.ratingCount ?? 0) ||
      Math.abs(row.fanAverageRating - expectedAvg) > EPSILON
    if (differs) {
      teamDrift += 1
      if (teamDrift <= 10) {
        console.log(
          `[RefereeTeamStat] ${key} 배정 ${row.totalAssignments}→${expected?.totalAssignments ?? 0}, ` +
            `카드 ${row.totalYellowCards}/${row.totalRedCards}→${expected?.totalYellowCards ?? 0}/${expected?.totalRedCards ?? 0}, ` +
            `팬 평점 ${row.fanAverageRating.toFixed(2)}(${row.fanRatingCount})→${expectedAvg.toFixed(2)}(${expected?.ratingCount ?? 0})`
        )
      }
    }
  }
  const missingTeamRows = [...teamStats.keys()].filter((key) => !seenTeamKeys.has(key)).length

  console.log(
    `\nRefereeStats: 현재 ${currentSeasonStats.length}행, 기대 ${seasonStats.size}행, 값 불일치 ${seasonDrift}행, 누락 ${missingSeasonRows}행`
  )
  console.log(
    `RefereeTeamStat: 현재 ${currentTeamStats.length}행, 기대 ${teamStats.size}행, 값 불일치 ${teamDrift}행, 누락 ${missingTeamRows}행`
  )

  if (!apply) {
    console.log("\n차이만 확인했습니다. 반영하려면 --apply 를 붙여 다시 실행하세요.")
    return
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.refereeStats.deleteMany()
      await tx.refereeStats.createMany({
        data: [...seasonStats.values()].map((stat) => ({
          refereeId: stat.refereeId,
          seasonId: stat.seasonId,
          leagueId: stat.leagueId,
          role: stat.role,
          matchCount: stat.matchCount,
          avgRating: average(stat.ratingSum, stat.ratingCount),
        })),
      })
      await tx.refereeTeamStat.deleteMany()
      await tx.refereeTeamStat.createMany({
        data: [...teamStats.values()].map((stat) => ({
          refereeId: stat.refereeId,
          teamId: stat.teamId,
          seasonId: stat.seasonId,
          leagueId: stat.leagueId,
          role: stat.role,
          totalAssignments: stat.totalAssignments,
          ...(stat.totalAssignments > 0 ? { roleCounts: { [stat.role]: stat.totalAssignments } } : {}),
          totalYellowCards: stat.totalYellowCards,
          totalRedCards: stat.totalRedCards,
          fanAverageRating: average(stat.ratingSum, stat.ratingCount),
          fanRatingCount: stat.ratingCount,
        })),
      })
    },
    { timeout: 60_000 }
  )
  console.log(`\n반영 완료: RefereeStats ${seasonStats.size}행, RefereeTeamStat ${teamStats.size}행`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
