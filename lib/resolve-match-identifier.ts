import type { PrismaClient } from "@prisma/client"
import { DISPLAY_NAME_TO_EMBLEM, SHORT_TO_EMBLEM } from "@/lib/team-short-names"

/** matchIdentifier: year + leagueSlug + roundNumber + (homeTeam/awayTeam 또는 roundOrder) */
export type MatchIdentifier =
  | { year: number; leagueSlug: string; roundNumber: number; homeTeam: string; awayTeam: string }
  | { year: number; leagueSlug: string; roundNumber: number; roundOrder: number }

export type ResolveMatchIdResult = { ok: true; matchId: string } | { ok: false; error: string }

/**
 * matchId를 모를 때 year, leagueSlug, roundNumber와 homeTeam/awayTeam(또는 roundOrder)으로 경기 ID 조회.
 * homeTeam/awayTeam은 TEAM_LIST.md 약칭(인천, 서울) 또는 표기명(인천 유나이티드) 사용.
 */
export async function resolveMatchIdFromIdentifier(
  prisma: PrismaClient,
  identifier: MatchIdentifier,
  itemLabel: string
): Promise<ResolveMatchIdResult> {
  const { year, leagueSlug, roundNumber } = identifier

  const season = await prisma.season.findUnique({ where: { year }, select: { id: true } })
  if (!season) {
    return { ok: false, error: `${itemLabel}: 시즌(연도 ${year})을 찾을 수 없습니다.` }
  }
  const league = await prisma.league.findFirst({
    where: { seasonId: season.id, slug: leagueSlug },
    select: { id: true },
  })
  if (!league) {
    return { ok: false, error: `${itemLabel}: 리그 ${leagueSlug}를 찾을 수 없습니다.` }
  }
  const round = await prisma.round.findFirst({
    where: { leagueId: league.id, number: roundNumber },
    select: { id: true, leagueId: true, league: { select: { slug: true } } },
  })
  if (!round) {
    return { ok: false, error: `${itemLabel}: 라운드 ${roundNumber}를 찾을 수 없습니다.` }
  }

  // 1) homeTeam / awayTeam으로 조회 (권장)
  if ("homeTeam" in identifier && "awayTeam" in identifier) {
    const homeTrim = identifier.homeTeam?.trim() ?? ""
    const awayTrim = identifier.awayTeam?.trim() ?? ""
    if (!homeTrim || !awayTrim) {
      return { ok: false, error: `${itemLabel}: matchIdentifier에 homeTeam, awayTeam을 모두 입력해 주세요.` }
    }
    const homeEmblem = DISPLAY_NAME_TO_EMBLEM[homeTrim] ?? SHORT_TO_EMBLEM[homeTrim]
    const awayEmblem = DISPLAY_NAME_TO_EMBLEM[awayTrim] ?? SHORT_TO_EMBLEM[awayTrim]
    if (!homeEmblem) {
      return { ok: false, error: `${itemLabel}: 알 수 없는 홈팀 '${identifier.homeTeam}' (TEAM_LIST.md 약칭 또는 표기명 사용)` }
    }
    if (!awayEmblem) {
      return { ok: false, error: `${itemLabel}: 알 수 없는 원정팀 '${identifier.awayTeam}' (TEAM_LIST.md 약칭 또는 표기명 사용)` }
    }

    const leagueSlugForEmblem = round.league.slug
    const leagueTeams = await prisma.team.findMany({
      where: { leagues: { some: { id: round.leagueId } } },
      select: { id: true, slug: true },
    })
    const teamByEmblem = new Map<string, string>()
    for (const t of leagueTeams) {
      if (!t.slug) continue
      const emblem = t.slug.includes("-") && t.slug.startsWith(`${leagueSlugForEmblem}-`)
        ? t.slug.slice(leagueSlugForEmblem.length + 1)
        : t.slug
      teamByEmblem.set(emblem, t.id)
    }
    async function getTeamId(emblem: string): Promise<string | null> {
      const fromMap = teamByEmblem.get(emblem)
      if (fromMap) return fromMap
      const team = await prisma.team.findFirst({
        where: { OR: [{ slug: emblem }, { slug: `${leagueSlugForEmblem}-${emblem}` }] },
        select: { id: true },
      })
      return team?.id ?? null
    }
    const homeTeamId = await getTeamId(homeEmblem)
    const awayTeamId = await getTeamId(awayEmblem)
    if (!homeTeamId) {
      return { ok: false, error: `${itemLabel}: 홈팀 '${identifier.homeTeam}'에 해당하는 팀을 찾을 수 없습니다.` }
    }
    if (!awayTeamId) {
      return { ok: false, error: `${itemLabel}: 원정팀 '${identifier.awayTeam}'에 해당하는 팀을 찾을 수 없습니다.` }
    }

    const match = await prisma.match.findFirst({
      where: { roundId: round.id, homeTeamId, awayTeamId },
      select: { id: true },
    })
    if (!match) {
      return { ok: false, error: `${itemLabel}: 해당 라운드에서 '${identifier.homeTeam}' vs '${identifier.awayTeam}' 경기를 찾을 수 없습니다.` }
    }
    return { ok: true, matchId: match.id }
  }

  // 2) roundOrder로 조회 (하위 호환)
  if ("roundOrder" in identifier) {
    const match = await prisma.match.findFirst({
      where: { roundId: round.id, roundOrder: identifier.roundOrder },
      select: { id: true },
    })
    if (!match) {
      return { ok: false, error: `${itemLabel}: 해당 경기(roundOrder ${identifier.roundOrder})를 찾을 수 없습니다.` }
    }
    return { ok: true, matchId: match.id }
  }

  return { ok: false, error: `${itemLabel}: matchIdentifier에 homeTeam/awayTeam 또는 roundOrder를 입력해 주세요.` }
}
