/**
 * RefereeStats, RefereeTeamStat 동기화. 둘 다 원본(MatchReferee, RefereeReview)에서 파생한 값이다.
 * - 배정이 바뀔 때: 경기 수·배정 수·카드 (syncRefereeStatsOnMatchReferee*)
 * - 평가가 바뀔 때: 팬 평점 (syncRefereeRatingStats)
 * 어긋난 값을 통째로 다시 만들려면 scripts/rebuild-referee-stats.ts 사용.
 */
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { RefereeRole } from "@prisma/client"

const ROLES: RefereeRole[] = ["MAIN", "ASSISTANT", "VAR", "WAITING"]

function roleCountsIncrement(
  current: Record<string, number> | null,
  role: RefereeRole
): Record<string, number> {
  const next = { ...(current ?? {}) }
  for (const r of ROLES) {
    if (!(r in next)) next[r] = 0
  }
  next[role] = (next[role] ?? 0) + 1
  return next
}

function roleCountsDecrement(
  current: Record<string, number> | null,
  role: RefereeRole
): Record<string, number> | null {
  if (!current || typeof current[role] !== "number") return current
  const next = { ...current }
  next[role] = Math.max(0, next[role] - 1)
  if (Object.values(next).every((v) => v === 0)) return null
  return next
}

/** MatchReferee 한 건 추가 시 RefereeStats·RefereeTeamStat 반영 */
export async function syncRefereeStatsOnMatchRefereeCreate(
  matchId: string,
  refereeId: string,
  role: RefereeRole
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      round: { select: { leagueId: true, league: { select: { seasonId: true } } } },
    },
  })
  if (!match) return

  const seasonId = match.round.league.seasonId
  const leagueId = match.round.leagueId

  await prisma.refereeStats.upsert({
    where: {
      refereeId_seasonId_leagueId_role: { refereeId, seasonId, leagueId, role },
    },
    update: { matchCount: { increment: 1 } },
    create: { refereeId, seasonId, leagueId, role, matchCount: 1 },
  })

  for (const teamId of [match.homeTeamId, match.awayTeamId]) {
    const existing = await prisma.refereeTeamStat.findUnique({
      where: {
        refereeId_teamId_seasonId_leagueId_role: {
          refereeId,
          teamId,
          seasonId,
          leagueId,
          role,
        },
      },
      select: { id: true, roleCounts: true, totalAssignments: true },
    })
    const roleCounts = roleCountsIncrement(
      existing?.roleCounts as Record<string, number> | null,
      role
    )
    await prisma.refereeTeamStat.upsert({
      where: {
        refereeId_teamId_seasonId_leagueId_role: {
          refereeId,
          teamId,
          seasonId,
          leagueId,
          role,
        },
      },
      update: {
        totalAssignments: { increment: 1 },
        roleCounts: roleCounts as object,
      },
      create: {
        refereeId,
        teamId,
        seasonId,
        leagueId,
        role,
        totalAssignments: 1,
        roleCounts: roleCounts as object,
      },
    })
  }
}

type MatchRefereeCards = {
  homeYellowCards: number
  homeRedCards: number
  awayYellowCards: number
  awayRedCards: number
}

/**
 * MatchReferee 한 건 삭제 시 RefereeStats·RefereeTeamStat에서 차감.
 * cards를 넘기면 그 배정에 기록돼 있던 카드도 팀별 카드 합계에서 뺀다.
 */
export async function syncRefereeStatsOnMatchRefereeDelete(
  matchId: string,
  refereeId: string,
  role: RefereeRole,
  cards?: MatchRefereeCards
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      round: { select: { leagueId: true, league: { select: { seasonId: true } } } },
    },
  })
  if (!match) return

  const seasonId = match.round.league.seasonId
  const leagueId = match.round.leagueId

  const stat = await prisma.refereeStats.findUnique({
    where: { refereeId_seasonId_leagueId_role: { refereeId, seasonId, leagueId, role } },
    select: { matchCount: true },
  })
  if (stat && stat.matchCount > 0) {
    await prisma.refereeStats.update({
      where: { refereeId_seasonId_leagueId_role: { refereeId, seasonId, leagueId, role } },
      data: { matchCount: Math.max(0, stat.matchCount - 1) },
    })
  }

  for (const teamId of [match.homeTeamId, match.awayTeamId]) {
    const existing = await prisma.refereeTeamStat.findUnique({
      where: {
        refereeId_teamId_seasonId_leagueId_role: {
          refereeId,
          teamId,
          seasonId,
          leagueId,
          role,
        },
      },
      select: {
        roleCounts: true,
        totalAssignments: true,
        totalYellowCards: true,
        totalRedCards: true,
      },
    })
    if (!existing) continue
    const nextRoleCounts = roleCountsDecrement(
      existing.roleCounts as Record<string, number> | null,
      role
    )
    const isHome = teamId === match.homeTeamId
    await prisma.refereeTeamStat.update({
      where: {
        refereeId_teamId_seasonId_leagueId_role: {
          refereeId,
          teamId,
          seasonId,
          leagueId,
          role,
        },
      },
      data: {
        totalAssignments: Math.max(0, existing.totalAssignments - 1),
        roleCounts: nextRoleCounts !== null ? (nextRoleCounts as object) : Prisma.JsonNull,
        ...(cards
          ? {
              totalYellowCards: Math.max(
                0,
                existing.totalYellowCards - (isHome ? cards.homeYellowCards : cards.awayYellowCards)
              ),
              totalRedCards: Math.max(
                0,
                existing.totalRedCards - (isHome ? cards.homeRedCards : cards.awayRedCards)
              ),
            }
          : {}),
      },
    })
  }
}

/** MatchReferee 수정(심판/역할 변경) 시: 기존 반영 제거 후 새로 반영 */
export async function syncRefereeStatsOnMatchRefereeUpdate(
  matchId: string,
  oldRefereeId: string,
  oldRole: RefereeRole,
  newRefereeId: string,
  newRole: RefereeRole
): Promise<void> {
  await syncRefereeStatsOnMatchRefereeDelete(matchId, oldRefereeId, oldRole)
  await syncRefereeStatsOnMatchRefereeCreate(matchId, newRefereeId, newRole)
}

/** MatchReferee 카드 수 변경 시 RefereeTeamStat의 totalYellowCards/totalRedCards 반영 */
export async function syncRefereeTeamStatCardsForMatchReferee(
  matchRefereeId: string,
  newCards: MatchRefereeCards
): Promise<void> {
  const mr = await prisma.matchReferee.findUnique({
    where: { id: matchRefereeId },
    select: {
      refereeId: true,
      homeYellowCards: true,
      homeRedCards: true,
      awayYellowCards: true,
      awayRedCards: true,
      role: true,
      match: {
        select: {
          homeTeamId: true,
          awayTeamId: true,
          round: { select: { leagueId: true, league: { select: { seasonId: true } } } },
        },
      },
    },
  })
  if (!mr) return

  const dHomeY = newCards.homeYellowCards - mr.homeYellowCards
  const dHomeR = newCards.homeRedCards - mr.homeRedCards
  const dAwayY = newCards.awayYellowCards - mr.awayYellowCards
  const dAwayR = newCards.awayRedCards - mr.awayRedCards
  if (dHomeY === 0 && dHomeR === 0 && dAwayY === 0 && dAwayR === 0) return

  if (dHomeY !== 0 || dHomeR !== 0) {
    const homeKey = {
      refereeId: mr.refereeId,
      teamId: mr.match.homeTeamId,
      seasonId: mr.match.round.league.seasonId,
      leagueId: mr.match.round.leagueId,
      role: mr.role,
    }
    const existing = await prisma.refereeTeamStat.findUnique({
      where: { refereeId_teamId_seasonId_leagueId_role: homeKey },
      select: { totalYellowCards: true, totalRedCards: true },
    })
    const newTotalY = (existing?.totalYellowCards ?? 0) + dHomeY
    const newTotalR = (existing?.totalRedCards ?? 0) + dHomeR
    await prisma.refereeTeamStat.upsert({
      where: { refereeId_teamId_seasonId_leagueId_role: homeKey },
      update: {
        totalYellowCards: Math.max(0, newTotalY),
        totalRedCards: Math.max(0, newTotalR),
      },
      create: {
        ...homeKey,
        totalYellowCards: Math.max(0, newTotalY),
        totalRedCards: Math.max(0, newTotalR),
      },
    })
  }
  if (dAwayY !== 0 || dAwayR !== 0) {
    const awayKey = {
      refereeId: mr.refereeId,
      teamId: mr.match.awayTeamId,
      seasonId: mr.match.round.league.seasonId,
      leagueId: mr.match.round.leagueId,
      role: mr.role,
    }
    const existing = await prisma.refereeTeamStat.findUnique({
      where: { refereeId_teamId_seasonId_leagueId_role: awayKey },
      select: { totalYellowCards: true, totalRedCards: true },
    })
    const newTotalY = (existing?.totalYellowCards ?? 0) + dAwayY
    const newTotalR = (existing?.totalRedCards ?? 0) + dAwayR
    await prisma.refereeTeamStat.upsert({
      where: { refereeId_teamId_seasonId_leagueId_role: awayKey },
      update: {
        totalYellowCards: Math.max(0, newTotalY),
        totalRedCards: Math.max(0, newTotalR),
      },
      create: {
        ...awayKey,
        totalYellowCards: Math.max(0, newTotalY),
        totalRedCards: Math.max(0, newTotalR),
      },
    })
  }
}

/**
 * 평가 한 건이 생기거나 평점·노출 상태·응원팀이 바뀌었을 때 팬 평점 파생값을 다시 집계한다.
 * 숨김·심의 중인 평가는 평점에서 빠져야 하므로 작성뿐 아니라 숨김/재노출 때도 호출해야 한다.
 * - RefereeStats.avgRating: 해당 시즌·리그·역할의 평균
 * - RefereeTeamStat.fanAverageRating/fanRatingCount: 넘겨받은 응원팀별 평균
 */
export async function syncRefereeRatingStats(params: {
  refereeId: string
  matchId: string
  role: RefereeRole
  /** 영향받는 응원팀. 응원팀이 바뀐 수정이면 이전 팀과 새 팀을 모두 넘긴다. */
  fanTeamIds: ReadonlyArray<string | null | undefined>
}): Promise<void> {
  const { refereeId, matchId, role, fanTeamIds } = params
  await syncRefereeRatingStatsForReviews(
    fanTeamIds.length > 0
      ? fanTeamIds.map((fanTeamId) => ({ refereeId, matchId, role, fanTeamId }))
      : [{ refereeId, matchId, role, fanTeamId: null }]
  )
}

/**
 * 여러 평가가 한꺼번에 바뀌었을 때(회원 탈퇴 등) 영향받은 조합만 한 번씩 다시 집계한다.
 * 같은 심판·응원팀 조합은 평가가 몇 경기에 걸쳐 있든 재계산이 한 번이면 충분하다.
 */
export async function syncRefereeRatingStatsForReviews(
  reviews: ReadonlyArray<{
    refereeId: string
    matchId: string
    role: RefereeRole
    fanTeamId?: string | null
  }>
): Promise<void> {
  if (reviews.length === 0) return

  const matches = await prisma.match.findMany({
    where: { id: { in: [...new Set(reviews.map((review) => review.matchId))] } },
    select: { id: true, round: { select: { leagueId: true, league: { select: { seasonId: true } } } } },
  })
  const leagueByMatchId = new Map(
    matches.map((match) => [
      match.id,
      { leagueId: match.round.leagueId, seasonId: match.round.league.seasonId },
    ])
  )

  const seasonTargets = new Map<
    string,
    { refereeId: string; role: RefereeRole; leagueId: string; seasonId: string }
  >()
  const teamTargets = new Map<string, { refereeId: string; teamId: string }>()
  for (const review of reviews) {
    const league = leagueByMatchId.get(review.matchId)
    if (league) {
      seasonTargets.set(`${review.refereeId}:${review.role}:${league.leagueId}`, {
        refereeId: review.refereeId,
        role: review.role,
        ...league,
      })
    }
    if (review.fanTeamId) {
      teamTargets.set(`${review.refereeId}:${review.fanTeamId}`, {
        refereeId: review.refereeId,
        teamId: review.fanTeamId,
      })
    }
  }

  for (const { refereeId, role, leagueId, seasonId } of seasonTargets.values()) {
    const aggregate = await prisma.refereeReview.aggregate({
      where: { refereeId, role, status: "VISIBLE", match: { round: { leagueId } } },
      _avg: { rating: true },
    })
    await prisma.refereeStats.updateMany({
      where: { refereeId, seasonId, leagueId, role },
      data: { avgRating: aggregate._avg.rating ?? 0 },
    })
  }
  for (const { refereeId, teamId } of teamTargets.values()) {
    await syncRefereeTeamFanRating(refereeId, teamId)
  }
}

/**
 * (refereeId, teamId)의 팬 평점을 시즌·리그·역할 단위로 다시 집계한다.
 * 배정 횟수와 평가 수를 분리하여 평점 저장이 배정 통계를 덮어쓰지 않게 한다.
 */
async function syncRefereeTeamFanRating(refereeId: string, teamId: string): Promise<void> {
  const reviews = await prisma.refereeReview.findMany({
    where: { refereeId, fanTeamId: teamId, status: "VISIBLE" },
    select: {
      rating: true,
      role: true,
      match: {
        select: {
          round: { select: { leagueId: true, league: { select: { seasonId: true } } } },
        },
      },
    },
  })

  const grouped = new Map<
    string,
    {
      seasonId: string
      leagueId: string
      role: RefereeRole
      ratings: number[]
    }
  >()
  for (const review of reviews) {
    const seasonId = review.match.round.league.seasonId
    const leagueId = review.match.round.leagueId
    const key = `${seasonId}:${leagueId}:${review.role}`
    const current = grouped.get(key)
    if (current) current.ratings.push(review.rating)
    else grouped.set(key, { seasonId, leagueId, role: review.role, ratings: [review.rating] })
  }

  await prisma.$transaction(async (tx) => {
    await tx.refereeTeamStat.updateMany({
      where: { refereeId, teamId },
      data: { fanAverageRating: 0, fanRatingCount: 0 },
    })

    for (const group of grouped.values()) {
      const fanRatingCount = group.ratings.length
      const fanAverageRating =
        group.ratings.reduce((sum, rating) => sum + rating, 0) / fanRatingCount
      await tx.refereeTeamStat.upsert({
        where: {
          refereeId_teamId_seasonId_leagueId_role: {
            refereeId,
            teamId,
            seasonId: group.seasonId,
            leagueId: group.leagueId,
            role: group.role,
          },
        },
        update: { fanAverageRating, fanRatingCount },
        create: {
          refereeId,
          teamId,
          seasonId: group.seasonId,
          leagueId: group.leagueId,
          role: group.role,
          fanAverageRating,
          fanRatingCount,
        },
      })
    }
  })
}
