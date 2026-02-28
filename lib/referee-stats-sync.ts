/**
 * MatchReferee 생성/수정/삭제 시 RefereeStats, RefereeTeamStat 동기화.
 * - RefereeStats: referee별 시즌·리그·역할별 경기 수(matchCount)
 * - RefereeTeamStat: referee별 팀별 배정 횟수(totalAssignments), 역할별 횟수(roleCounts)
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
      where: { refereeId_teamId: { refereeId, teamId } },
      select: { id: true, roleCounts: true, totalAssignments: true },
    })
    const roleCounts = roleCountsIncrement(
      existing?.roleCounts as Record<string, number> | null,
      role
    )
    await prisma.refereeTeamStat.upsert({
      where: { refereeId_teamId: { refereeId, teamId } },
      update: {
        totalAssignments: { increment: 1 },
        roleCounts: roleCounts as object,
      },
      create: {
        refereeId,
        teamId,
        totalAssignments: 1,
        roleCounts: roleCounts as object,
      },
    })
  }
}

/** MatchReferee 한 건 삭제 시 RefereeStats·RefereeTeamStat에서 차감 */
export async function syncRefereeStatsOnMatchRefereeDelete(
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
      where: { refereeId_teamId: { refereeId, teamId } },
      select: { roleCounts: true, totalAssignments: true },
    })
    if (!existing) continue
    const nextRoleCounts = roleCountsDecrement(
      existing.roleCounts as Record<string, number> | null,
      role
    )
    await prisma.refereeTeamStat.update({
      where: { refereeId_teamId: { refereeId, teamId } },
      data: {
        totalAssignments: Math.max(0, existing.totalAssignments - 1),
        roleCounts: nextRoleCounts !== null ? (nextRoleCounts as object) : Prisma.JsonNull,
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
  newCards: {
    homeYellowCards: number
    homeRedCards: number
    awayYellowCards: number
    awayRedCards: number
  }
): Promise<void> {
  const mr = await prisma.matchReferee.findUnique({
    where: { id: matchRefereeId },
    select: {
      refereeId: true,
      homeYellowCards: true,
      homeRedCards: true,
      awayYellowCards: true,
      awayRedCards: true,
      match: { select: { homeTeamId: true, awayTeamId: true } },
    },
  })
  if (!mr) return

  const dHomeY = newCards.homeYellowCards - mr.homeYellowCards
  const dHomeR = newCards.homeRedCards - mr.homeRedCards
  const dAwayY = newCards.awayYellowCards - mr.awayYellowCards
  const dAwayR = newCards.awayRedCards - mr.awayRedCards
  if (dHomeY === 0 && dHomeR === 0 && dAwayY === 0 && dAwayR === 0) return

  if (dHomeY !== 0 || dHomeR !== 0) {
    const existing = await prisma.refereeTeamStat.findUnique({
      where: { refereeId_teamId: { refereeId: mr.refereeId, teamId: mr.match.homeTeamId } },
      select: { totalYellowCards: true, totalRedCards: true },
    })
    const newTotalY = (existing?.totalYellowCards ?? 0) + dHomeY
    const newTotalR = (existing?.totalRedCards ?? 0) + dHomeR
    await prisma.refereeTeamStat.upsert({
      where: { refereeId_teamId: { refereeId: mr.refereeId, teamId: mr.match.homeTeamId } },
      update: {
        totalYellowCards: Math.max(0, newTotalY),
        totalRedCards: Math.max(0, newTotalR),
      },
      create: {
        refereeId: mr.refereeId,
        teamId: mr.match.homeTeamId,
        totalYellowCards: Math.max(0, newTotalY),
        totalRedCards: Math.max(0, newTotalR),
      },
    })
  }
  if (dAwayY !== 0 || dAwayR !== 0) {
    const existing = await prisma.refereeTeamStat.findUnique({
      where: { refereeId_teamId: { refereeId: mr.refereeId, teamId: mr.match.awayTeamId } },
      select: { totalYellowCards: true, totalRedCards: true },
    })
    const newTotalY = (existing?.totalYellowCards ?? 0) + dAwayY
    const newTotalR = (existing?.totalRedCards ?? 0) + dAwayR
    await prisma.refereeTeamStat.upsert({
      where: { refereeId_teamId: { refereeId: mr.refereeId, teamId: mr.match.awayTeamId } },
      update: {
        totalYellowCards: Math.max(0, newTotalY),
        totalRedCards: Math.max(0, newTotalR),
      },
      create: {
        refereeId: mr.refereeId,
        teamId: mr.match.awayTeamId,
        totalYellowCards: Math.max(0, newTotalY),
        totalRedCards: Math.max(0, newTotalR),
      },
    })
  }
}
