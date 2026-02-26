"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { MatchStatus, RefereeRole } from "@prisma/client"

export type UpdateMatchScheduleResult = { ok: true } | { ok: false; error: string }
export type CreateMatchResult = { ok: true; matchId: string } | { ok: false; error: string }
export type DeleteMatchResult = { ok: true } | { ok: false; error: string }
export type CreateSeasonResult = { ok: true; seasonId: string; year: number } | { ok: false; error: string }
export type CreateLeagueResult = { ok: true; leagueId: string; slug: string } | { ok: false; error: string }
export type CreateRoundResult = { ok: true; roundId: string; slug: string } | { ok: false; error: string }
export type CreateMatchRefereeResult = { ok: true; id: string } | { ok: false; error: string }
export type UpdateMatchRefereeResult = { ok: true } | { ok: false; error: string }
export type DeleteMatchRefereeResult = { ok: true } | { ok: false; error: string }

export async function updateMatchSchedule(
  matchId: string,
  data: {
    playedAt?: Date | null
    venue?: string | null
    status?: MatchStatus
  }
): Promise<UpdateMatchScheduleResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, roundId: true },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }

  const updateData: {
    playedAt?: Date | null
    venue?: string | null
    status?: MatchStatus
  } = {}
  if (data.playedAt !== undefined) updateData.playedAt = data.playedAt
  if (data.venue !== undefined) updateData.venue = data.venue?.trim() || null
  if (data.status !== undefined) updateData.status = data.status

  try {
    await prisma.match.update({
      where: { id: matchId },
      data: updateData,
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("updateMatchSchedule:", e)
    return { ok: false, error: "일정 수정에 실패했습니다." }
  }
}

export async function createMatch(data: {
  roundId: string
  roundOrder: number
  homeTeamId: string
  awayTeamId: string
  playedAt: Date | null
  venue: string | null
}): Promise<CreateMatchResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const round = await prisma.round.findUnique({
    where: { id: data.roundId },
    select: { id: true },
  })
  if (!round) return { ok: false, error: "라운드를 찾을 수 없습니다." }

  if (data.homeTeamId === data.awayTeamId) {
    return { ok: false, error: "홈팀과 원정팀이 같을 수 없습니다." }
  }

  try {
    const match = await prisma.match.create({
      data: {
        roundId: data.roundId,
        roundOrder: data.roundOrder,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        playedAt: data.playedAt ?? undefined,
        venue: data.venue?.trim() || null,
      },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true, matchId: match.id }
  } catch (e) {
    console.error("createMatch:", e)
    return { ok: false, error: "경기 추가에 실패했습니다." }
  }
}

export async function deleteMatch(matchId: string): Promise<DeleteMatchResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }

  try {
    await prisma.match.delete({ where: { id: matchId } })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("deleteMatch:", e)
    return { ok: false, error: "경기 삭제에 실패했습니다." }
  }
}

export async function createSeason(year: number): Promise<CreateSeasonResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const y = Number(year)
  if (!Number.isInteger(y) || y < 1990 || y > 2100) {
    return { ok: false, error: "연도는 1990~2100 정수로 입력해 주세요." }
  }

  const existing = await prisma.season.findUnique({ where: { year: y }, select: { id: true } })
  if (existing) return { ok: false, error: "이미 존재하는 시즌(연도)입니다." }

  try {
    const season = await prisma.season.create({ data: { year: y } })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true, seasonId: season.id, year: season.year }
  } catch (e) {
    console.error("createSeason:", e)
    return { ok: false, error: "시즌 추가에 실패했습니다." }
  }
}

export async function createLeague(data: {
  seasonId: string
  name: string
  slug: string
}): Promise<CreateLeagueResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const name = data.name?.trim()
  const slug = data.slug?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || ""
  if (!name) return { ok: false, error: "리그 이름을 입력해 주세요." }
  if (!slug) return { ok: false, error: "리그 슬러그를 입력해 주세요." }

  const season = await prisma.season.findUnique({
    where: { id: data.seasonId },
    select: { id: true },
  })
  if (!season) return { ok: false, error: "시즌을 찾을 수 없습니다." }

  const duplicate = await prisma.league.findUnique({
    where: { seasonId_slug: { seasonId: data.seasonId, slug } },
  })
  if (duplicate) return { ok: false, error: "이미 존재하는 리그 슬러그입니다." }

  try {
    const league = await prisma.league.create({
      data: { seasonId: data.seasonId, name, slug },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true, leagueId: league.id, slug: league.slug }
  } catch (e) {
    console.error("createLeague:", e)
    return { ok: false, error: "리그 추가에 실패했습니다." }
  }
}

export async function createRound(data: {
  leagueId: string
  number: number
  slug?: string | null
}): Promise<CreateRoundResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const num = Number(data.number)
  if (!Number.isInteger(num) || num < 1) {
    return { ok: false, error: "라운드 번호는 1 이상 정수로 입력해 주세요." }
  }

  const league = await prisma.league.findUnique({
    where: { id: data.leagueId },
    select: { id: true },
  })
  if (!league) return { ok: false, error: "리그를 찾을 수 없습니다." }

  const slug = (data.slug?.trim() || `round-${num}`).toLowerCase()
  const slugNorm = slug.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `round-${num}`

  const duplicateNumber = await prisma.round.findUnique({
    where: { leagueId_number: { leagueId: data.leagueId, number: num } },
  })
  if (duplicateNumber) return { ok: false, error: "이미 존재하는 라운드 번호입니다." }

  const duplicateSlug = await prisma.round.findUnique({
    where: { leagueId_slug: { leagueId: data.leagueId, slug: slugNorm } },
  })
  if (duplicateSlug) return { ok: false, error: "이미 존재하는 라운드 슬러그입니다." }

  try {
    const round = await prisma.round.create({
      data: { leagueId: data.leagueId, number: num, slug: slugNorm },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true, roundId: round.id, slug: round.slug }
  } catch (e) {
    console.error("createRound:", e)
    return { ok: false, error: "라운드 추가에 실패했습니다." }
  }
}

export async function createMatchReferee(
  matchId: string,
  refereeId: string,
  role: RefereeRole
): Promise<CreateMatchRefereeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }

  const referee = await prisma.referee.findUnique({
    where: { id: refereeId },
    select: { id: true },
  })
  if (!referee) return { ok: false, error: "심판을 찾을 수 없습니다." }

  const existing = await prisma.matchReferee.findUnique({
    where: {
      matchId_refereeId_role: { matchId, refereeId, role },
    },
  })
  if (existing) return { ok: false, error: "이미 해당 경기에 같은 역할로 배정된 심판입니다." }

  try {
    const mr = await prisma.matchReferee.create({
      data: { matchId, refereeId, role },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true, id: mr.id }
  } catch (e) {
    console.error("createMatchReferee:", e)
    return { ok: false, error: "심판 배정에 실패했습니다." }
  }
}

export async function updateMatchReferee(
  matchRefereeId: string,
  data: { refereeId: string; role: RefereeRole }
): Promise<UpdateMatchRefereeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const mr = await prisma.matchReferee.findUnique({
    where: { id: matchRefereeId },
    select: { id: true, matchId: true },
  })
  if (!mr) return { ok: false, error: "배정 정보를 찾을 수 없습니다." }

  const referee = await prisma.referee.findUnique({
    where: { id: data.refereeId },
    select: { id: true },
  })
  if (!referee) return { ok: false, error: "심판을 찾을 수 없습니다." }

  const existing = await prisma.matchReferee.findFirst({
    where: {
      matchId: mr.matchId,
      refereeId: data.refereeId,
      role: data.role,
      id: { not: matchRefereeId },
    },
  })
  if (existing) return { ok: false, error: "이미 해당 경기에 같은 역할로 배정된 심판입니다." }

  try {
    await prisma.matchReferee.update({
      where: { id: matchRefereeId },
      data: { refereeId: data.refereeId, role: data.role },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("updateMatchReferee:", e)
    return { ok: false, error: "배정 수정에 실패했습니다." }
  }
}

export async function deleteMatchReferee(matchRefereeId: string): Promise<DeleteMatchRefereeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const mr = await prisma.matchReferee.findUnique({
    where: { id: matchRefereeId },
    select: { id: true },
  })
  if (!mr) return { ok: false, error: "배정 정보를 찾을 수 없습니다." }

  try {
    await prisma.matchReferee.delete({ where: { id: matchRefereeId } })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("deleteMatchReferee:", e)
    return { ok: false, error: "배정 삭제에 실패했습니다." }
  }
}
