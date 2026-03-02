"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SHORT_TO_EMBLEM, DISPLAY_NAME_TO_EMBLEM } from "@/lib/team-short-names"
import {
  resolveMatchIdFromIdentifier,
  type MatchIdentifier,
} from "@/lib/resolve-match-identifier"
import {
  syncRefereeStatsOnMatchRefereeCreate,
  syncRefereeStatsOnMatchRefereeDelete,
  syncRefereeStatsOnMatchRefereeUpdate,
} from "@/lib/referee-stats-sync"
import type { MatchStatus, RefereeRole } from "@prisma/client"

export type UpdateMatchScheduleResult = { ok: true } | { ok: false; error: string }
export type CreateMatchResult = { ok: true; matchId: string } | { ok: false; error: string }
export type DeleteMatchResult = { ok: true } | { ok: false; error: string }
export type ImportBulkMatchesResult =
  | { ok: true; created: number }
  | { ok: false; error: string }
export type CreateSeasonResult = { ok: true; seasonId: string; year: number } | { ok: false; error: string }
export type CreateLeagueResult = { ok: true; leagueId: string; slug: string } | { ok: false; error: string }
export type CreateRoundResult = { ok: true; roundId: string; slug: string } | { ok: false; error: string }
export type CreateRoundsInRangeResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string }
export type CreateMatchRefereeResult = { ok: true; id: string } | { ok: false; error: string }
export type UpdateMatchRefereeResult = { ok: true } | { ok: false; error: string }
export type DeleteMatchRefereeResult = { ok: true } | { ok: false; error: string }
export type ImportBulkRefereeAssignmentsResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string }

export async function updateMatchSchedule(
  matchId: string,
  data: {
    playedAt?: Date | null
    venue?: string | null
    status?: MatchStatus
    youtubeUrl?: string | null
    instagramUrl?: string | null
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
    youtubeUrl?: string | null
    instagramUrl?: string | null
  } = {}
  if (data.playedAt !== undefined) updateData.playedAt = data.playedAt
  if (data.venue !== undefined) updateData.venue = data.venue?.trim() || null
  if (data.status !== undefined) updateData.status = data.status
  if (data.youtubeUrl !== undefined) updateData.youtubeUrl = data.youtubeUrl?.trim() || null
  if (data.instagramUrl !== undefined) updateData.instagramUrl = data.instagramUrl?.trim() || null

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

/** JSON 파일 내용을 파싱해 해당 라운드에 경기 일괄 추가. 형식: { "matches": [ { "home": "인천", "away": "서울", "date": "2026-02-28T14:00:00Z", "stadium": "인천축구전용" } ] } */
export async function importBulkMatchesFromJson(
  roundId: string,
  jsonString: string
): Promise<ImportBulkMatchesResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  let payload: { matches?: Array<{ home: string; away: string; date: string; stadium?: string }> }
  try {
    payload = JSON.parse(jsonString) as typeof payload
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  const matches = payload?.matches
  if (!Array.isArray(matches) || matches.length === 0) {
    return { ok: false, error: "JSON에 'matches' 배열이 비어 있거나 없습니다." }
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, leagueId: true, league: { select: { slug: true } } },
  })
  if (!round) return { ok: false, error: "라운드를 찾을 수 없습니다." }
  const leagueSlug = round.league.slug

  const leagueTeams = await prisma.team.findMany({
    where: { leagues: { some: { id: round.leagueId } } },
    select: { id: true, slug: true },
  })
  const teamByEmblem = new Map<string, string>()
  for (const t of leagueTeams) {
    if (!t.slug) continue
    const emblem =
      t.slug.includes("-") && t.slug.startsWith(`${leagueSlug}-`)
        ? t.slug.slice(leagueSlug.length + 1)
        : t.slug
    teamByEmblem.set(emblem, t.id)
  }

  // 리그에 팀이 없거나 emblem 매칭이 안 되면 전역에서 slug(emblem)로 팀 조회 (시즌/리그별 팀 연결 없어도 일괄 등록 가능)
  async function resolveTeamId(emblem: string): Promise<string | null> {
    const fromLeague = teamByEmblem.get(emblem)
    if (fromLeague) return fromLeague
    const team = await prisma.team.findFirst({
      where: { slug: emblem },
      select: { id: true },
    })
    if (team) {
      teamByEmblem.set(emblem, team.id)
      return team.id
    }
    return null
  }

  const maxOrder = await prisma.match
    .aggregate({
      where: { roundId },
      _max: { roundOrder: true },
    })
    .then((r) => r._max.roundOrder ?? 0)

  let created = 0
  for (let i = 0; i < matches.length; i++) {
    const row = matches[i]
    if (!row?.home || !row?.away || !row?.date) {
      return { ok: false, error: `${i + 1}번째 경기: home, away, date는 필수입니다.` }
    }
    const homeEmblem = DISPLAY_NAME_TO_EMBLEM[row.home.trim()] ?? SHORT_TO_EMBLEM[row.home.trim()]
    const awayEmblem = DISPLAY_NAME_TO_EMBLEM[row.away.trim()] ?? SHORT_TO_EMBLEM[row.away.trim()]
    if (!homeEmblem) return { ok: false, error: `${i + 1}번째 경기: 알 수 없는 홈팀 '${row.home}' (app/assets/docs/TEAM_LIST.md 표기 사용)` }
    if (!awayEmblem) return { ok: false, error: `${i + 1}번째 경기: 알 수 없는 원정팀 '${row.away}' (app/assets/docs/TEAM_LIST.md 표기 사용)` }
    const homeTeamId = await resolveTeamId(homeEmblem)
    const awayTeamId = await resolveTeamId(awayEmblem)
    if (!homeTeamId) return { ok: false, error: `${i + 1}번째 경기: 홈팀 '${row.home}'에 해당하는 팀을 찾을 수 없습니다. (팀 slug: ${homeEmblem})` }
    if (!awayTeamId) return { ok: false, error: `${i + 1}번째 경기: 원정팀 '${row.away}'에 해당하는 팀을 찾을 수 없습니다. (팀 slug: ${awayEmblem})` }
    if (homeTeamId === awayTeamId) {
      return { ok: false, error: `${i + 1}번째 경기: 홈팀과 원정팀이 같을 수 없습니다.` }
    }
    let playedAt: Date
    try {
      playedAt = new Date(row.date)
      if (Number.isNaN(playedAt.getTime())) throw new Error("Invalid date")
    } catch {
      return { ok: false, error: `${i + 1}번째 경기: 올바른 날짜 형식이 아닙니다. (예: 2026-02-28T14:00:00Z)` }
    }
    const now = Date.now()
    const matchStart = playedAt.getTime()
    const twoAndHalfHours = 2.5 * 60 * 60 * 1000
    let status: MatchStatus
    if (matchStart > now) {
      status = "SCHEDULED"
    } else if (matchStart + twoAndHalfHours < now) {
      status = "FINISHED"
    } else {
      status = "LIVE"
    }
    const roundOrder = maxOrder + i + 1
    try {
      await prisma.match.create({
        data: {
          roundId,
          roundOrder,
          homeTeamId,
          awayTeamId,
          playedAt,
          venue: row.stadium?.trim() || null,
          status,
        },
      })
      created++
    } catch (e) {
      console.error("importBulkMatchesFromJson create:", e)
      return { ok: false, error: `${i + 1}번째 경기 추가 중 오류가 발생했습니다. (순서 중복 등)` }
    }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/matches")
  revalidatePath("/matches")
  return { ok: true, created }
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
    revalidatePath("/admin/structure")
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
    revalidatePath("/admin/structure")
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
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    return { ok: true, roundId: round.id, slug: round.slug }
  } catch (e) {
    console.error("createRound:", e)
    return { ok: false, error: "라운드 추가에 실패했습니다." }
  }
}

/** 라운드 번호 범위(from ~ to, 둘 다 포함)로 한 번에 생성. 이미 있는 번호는 건너뜀. */
export async function createRoundsInRange(
  leagueId: string,
  fromNumber: number,
  toNumber: number
): Promise<CreateRoundsInRangeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const from = Number(fromNumber)
  const to = Number(toNumber)
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1) {
    return { ok: false, error: "시작·끝 번호는 1 이상 정수로 입력해 주세요." }
  }
  if (from > to) {
    return { ok: false, error: "시작 번호가 끝 번호보다 클 수 없습니다." }
  }
  const limit = 200
  if (to - from + 1 > limit) {
    return { ok: false, error: `한 번에 ${limit}개까지 가능합니다. (${from}~${to} = ${to - from + 1}개)` }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  })
  if (!league) return { ok: false, error: "리그를 찾을 수 없습니다." }

  const existing = await prisma.round.findMany({
    where: { leagueId, number: { gte: from, lte: to } },
    select: { number: true },
  })
  const existingSet = new Set(existing.map((r) => r.number))

  let created = 0
  let skipped = 0
  for (let num = from; num <= to; num++) {
    if (existingSet.has(num)) {
      skipped++
      continue
    }
    const slugNorm = `round-${num}`
    try {
      await prisma.round.create({
        data: { leagueId, number: num, slug: slugNorm },
      })
      created++
    } catch (e) {
      console.error("createRoundsInRange:", e)
      revalidatePath("/admin")
      revalidatePath("/admin/structure")
      revalidatePath("/admin/matches")
      revalidatePath("/matches")
      return { ok: false, error: `라운드 ${num} 추가 중 오류가 발생했습니다.` }
    }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/matches")
  revalidatePath("/admin/structure")
  revalidatePath("/matches")
  return { ok: true, created, skipped }
}

export type SetRoundFocusResult = { ok: true } | { ok: false; error: string }

/** 같은 리그 내에서 한 라운드만 포커스. true로 설정 시 해당 리그의 다른 라운드는 모두 false */
export async function setRoundFocus(roundId: string, isFocus: boolean): Promise<SetRoundFocusResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, leagueId: true },
  })
  if (!round) return { ok: false, error: "라운드를 찾을 수 없습니다." }

  try {
    if (isFocus) {
      await prisma.round.updateMany({
        where: { leagueId: round.leagueId },
        data: { isFocus: false },
      })
    }
    await prisma.round.update({
      where: { id: roundId },
      data: { isFocus },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    console.error("setRoundFocus:", e)
    return { ok: false, error: "포커스 설정에 실패했습니다." }
  }
}

// --- 시즌·리그·라운드 수정/삭제 (구조 관리 페이지용) ---

export type UpdateSeasonResult = { ok: true } | { ok: false; error: string }
export type UpdateLeagueResult = { ok: true } | { ok: false; error: string }
export type UpdateRoundResult = { ok: true } | { ok: false; error: string }
export type UpdateRoundLinksResult = { ok: true } | { ok: false; error: string }
export type DeleteSeasonResult = { ok: true } | { ok: false; error: string }
export type DeleteLeagueResult = { ok: true } | { ok: false; error: string }
export type DeleteRoundResult = { ok: true } | { ok: false; error: string }

export async function updateSeason(seasonId: string, year: number): Promise<UpdateSeasonResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const y = Number(year)
  if (!Number.isInteger(y) || y < 1990 || y > 2100) {
    return { ok: false, error: "연도는 1990~2100 정수로 입력해 주세요." }
  }

  const existing = await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true } })
  if (!existing) return { ok: false, error: "시즌을 찾을 수 없습니다." }

  const duplicate = await prisma.season.findUnique({ where: { year: y }, select: { id: true } })
  if (duplicate && duplicate.id !== seasonId) return { ok: false, error: "이미 존재하는 시즌(연도)입니다." }

  try {
    await prisma.season.update({ where: { id: seasonId }, data: { year: y } })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("updateSeason:", e)
    return { ok: false, error: "시즌 수정에 실패했습니다." }
  }
}

export async function updateLeague(
  leagueId: string,
  data: { name: string; slug: string }
): Promise<UpdateLeagueResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const name = data.name?.trim()
  const slug = data.slug?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || ""
  if (!name) return { ok: false, error: "리그 이름을 입력해 주세요." }
  if (!slug) return { ok: false, error: "리그 슬러그를 입력해 주세요." }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, seasonId: true },
  })
  if (!league) return { ok: false, error: "리그를 찾을 수 없습니다." }

  const duplicate = await prisma.league.findFirst({
    where: {
      seasonId: league.seasonId,
      slug,
      id: { not: leagueId },
    },
  })
  if (duplicate) return { ok: false, error: "같은 시즌에 이미 존재하는 리그 슬러그입니다." }

  try {
    await prisma.league.update({
      where: { id: leagueId },
      data: { name, slug },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("updateLeague:", e)
    return { ok: false, error: "리그 수정에 실패했습니다." }
  }
}

export async function updateRound(roundId: string, number: number): Promise<UpdateRoundResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const num = Number(number)
  if (!Number.isInteger(num) || num < 1) {
    return { ok: false, error: "라운드 번호는 1 이상 정수로 입력해 주세요." }
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, leagueId: true },
  })
  if (!round) return { ok: false, error: "라운드를 찾을 수 없습니다." }

  const duplicate = await prisma.round.findUnique({
    where: { leagueId_number: { leagueId: round.leagueId, number: num } },
  })
  if (duplicate && duplicate.id !== roundId) {
    return { ok: false, error: "이미 존재하는 라운드 번호입니다." }
  }

  const slug = `round-${num}`

  try {
    await prisma.round.update({
      where: { id: roundId },
      data: { number: num, slug },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("updateRound:", e)
    return { ok: false, error: "라운드 수정에 실패했습니다." }
  }
}

// 라운드별 외부 컨텐츠 링크 (유튜브 / 인스타그램) 수정
export async function updateRoundLinks(
  roundId: string,
  data: { youtubeUrl?: string | null; instagramUrl?: string | null }
): Promise<UpdateRoundLinksResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true },
  })
  if (!round) return { ok: false, error: "라운드를 찾을 수 없습니다." }

  const youtubeUrl = data.youtubeUrl?.trim() || null
  const instagramUrl = data.instagramUrl?.trim() || null

  try {
    await prisma.round.update({
      where: { id: roundId },
      data: {
        youtubeUrl,
        instagramUrl,
      },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    revalidatePath("/matches/archive")
    return { ok: true }
  } catch (e) {
    console.error("updateRoundLinks:", e)
    return { ok: false, error: "라운드 링크 수정에 실패했습니다." }
  }
}

export async function deleteRound(roundId: string): Promise<DeleteRoundResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { _count: { select: { matches: true } } },
  })
  if (!round) return { ok: false, error: "라운드를 찾을 수 없습니다." }
  if (round._count.matches > 0) {
    return { ok: false, error: "경기가 있는 라운드는 삭제할 수 없습니다. 먼저 경기를 삭제하세요." }
  }

  try {
    await prisma.round.delete({ where: { id: roundId } })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("deleteRound:", e)
    return { ok: false, error: "라운드 삭제에 실패했습니다." }
  }
}

export async function deleteLeague(leagueId: string): Promise<DeleteLeagueResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { _count: { select: { rounds: true } } },
  })
  if (!league) return { ok: false, error: "리그를 찾을 수 없습니다." }
  if (league._count.rounds > 0) {
    return { ok: false, error: "라운드가 있는 리그는 삭제할 수 없습니다. 먼저 라운드를 삭제하세요." }
  }

  try {
    await prisma.league.delete({ where: { id: leagueId } })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("deleteLeague:", e)
    return { ok: false, error: "리그 삭제에 실패했습니다." }
  }
}

export async function deleteSeason(seasonId: string): Promise<DeleteSeasonResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { _count: { select: { leagues: true } } },
  })
  if (!season) return { ok: false, error: "시즌을 찾을 수 없습니다." }
  if (season._count.leagues > 0) {
    return { ok: false, error: "리그가 있는 시즌은 삭제할 수 없습니다. 먼저 리그를 삭제하세요." }
  }

  try {
    await prisma.season.delete({ where: { id: seasonId } })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/structure")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("deleteSeason:", e)
    return { ok: false, error: "시즌 삭제에 실패했습니다." }
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
    await syncRefereeStatsOnMatchRefereeCreate(matchId, refereeId, role)
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/referee-assignments")
    revalidatePath("/matches")
    revalidatePath("/referees")
    revalidatePath("/teams")
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
    select: { id: true, matchId: true, refereeId: true, role: true },
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
    await syncRefereeStatsOnMatchRefereeUpdate(
      mr.matchId,
      mr.refereeId,
      mr.role,
      data.refereeId,
      data.role
    )
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/referee-assignments")
    revalidatePath("/matches")
    revalidatePath("/referees")
    revalidatePath("/teams")
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
    select: { id: true, matchId: true, refereeId: true, role: true },
  })
  if (!mr) return { ok: false, error: "배정 정보를 찾을 수 없습니다." }

  try {
    await syncRefereeStatsOnMatchRefereeDelete(mr.matchId, mr.refereeId, mr.role)
    await prisma.matchReferee.delete({ where: { id: matchRefereeId } })
    revalidatePath("/admin")
    revalidatePath("/admin/matches")
    revalidatePath("/admin/referee-assignments")
    revalidatePath("/matches")
    revalidatePath("/referees")
    revalidatePath("/teams")
    return { ok: true }
  } catch (e) {
    console.error("deleteMatchReferee:", e)
    return { ok: false, error: "배정 삭제에 실패했습니다." }
  }
}

/** JSON 파일로 심판 배정 일괄 추가. 형식: { "assignments": [ { "matchId": "...", "refereeSlug": "go-hyeongjin", "role": "MAIN" } ] } 또는 matchIdentifier: { "year": 2026, "leagueSlug": "kleague1", "roundNumber": 1, "homeTeam": "인천", "awayTeam": "서울" } (roundOrder도 하위 호환) */
export async function importBulkRefereeAssignmentsFromJson(
  jsonString: string
): Promise<ImportBulkRefereeAssignmentsResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  let payload: {
    assignments?: Array<{
      matchId?: string
      matchIdentifier?: MatchIdentifier
      refereeSlug?: string
      refereeId?: string
      role: RefereeRole
    }>
  }
  try {
    payload = JSON.parse(jsonString) as typeof payload
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  const assignments = payload?.assignments
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return { ok: false, error: "JSON에 'assignments' 배열이 비어 있거나 없습니다." }
  }

  const refereesBySlug = new Map(
    (await prisma.referee.findMany({ select: { id: true, slug: true } })).map((r) => [r.slug, r.id])
  )

  let created = 0
  let skipped = 0
  for (let i = 0; i < assignments.length; i++) {
    const row = assignments[i]!
    const role = row.role
    if (!role || !["MAIN", "ASSISTANT", "VAR", "WAITING"].includes(role)) {
      return { ok: false, error: `${i + 1}번째: role은 MAIN, ASSISTANT, VAR, WAITING 중 하나여야 합니다.` }
    }
    let matchId: string | null = row.matchId ?? null
    if (!matchId && row.matchIdentifier) {
      const resolved = await resolveMatchIdFromIdentifier(
        prisma,
        row.matchIdentifier as MatchIdentifier,
        `${i + 1}번째`
      )
      if (!resolved.ok) return { ok: false, error: resolved.error }
      matchId = resolved.matchId
    }
    if (!matchId) {
      return { ok: false, error: `${i + 1}번째: matchId 또는 matchIdentifier(year, leagueSlug, roundNumber, homeTeam, awayTeam)를 입력해 주세요.` }
    }
    const refereeId = row.refereeId ?? (row.refereeSlug ? refereesBySlug.get(row.refereeSlug) : undefined)
    if (!refereeId) {
      return {
        ok: false,
        error: `${i + 1}번째: 심판을 찾을 수 없습니다. (refereeSlug 또는 refereeId 확인)`,
      }
    }
    const existing = await prisma.matchReferee.findUnique({
      where: { matchId_refereeId_role: { matchId, refereeId, role } },
    })
    if (existing) {
      skipped++
      continue
    }
    try {
      await prisma.matchReferee.create({ data: { matchId, refereeId, role } })
      await syncRefereeStatsOnMatchRefereeCreate(matchId, refereeId, role)
      created++
    } catch (e) {
      console.error("importBulkRefereeAssignmentsFromJson:", e)
      return { ok: false, error: `${i + 1}번째 배정 추가 중 오류가 발생했습니다.` }
    }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/matches")
  revalidatePath("/admin/referee-assignments")
  revalidatePath("/matches")
  revalidatePath("/referees")
  revalidatePath("/teams")
  return { ok: true, created, skipped }
}
