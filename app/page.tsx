import { prisma } from "@/lib/prisma"
import { shortNameFromSlug } from "@/lib/team-short-names"
import { getMatchDetailPath } from "@/lib/match-url"
import { HotMomentsSection } from "@/components/home/HotMomentsSection"
import { LeagueMatchesSection } from "@/components/home/LeagueMatchesSection"
import { HomeEmptyState } from "@/components/home/HomeEmptyState"

type RoundWithMatches = Awaited<
  ReturnType<
    typeof prisma.round.findUnique<{
      where: { leagueId_number: { leagueId: string; number: number } }
      include: { league: true; matches: { include: { homeTeam: true; awayTeam: true }; orderBy: { playedAt: "asc" } } }
    }>
  >
>

export default async function HomePage() {
  // 메인에는 isFocus === true 인 라운드만 표시 (없으면 Focus Round 섹션 비표시)
  let k1Round1: RoundWithMatches = null
  let k2Round1: RoundWithMatches = null
  try {
    const focusRounds = await prisma.round.findMany({
      where: { isFocus: true },
      include: {
        league: true,
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            round: { include: { league: { include: { season: true } } } },
          },
          orderBy: { playedAt: "asc" },
        },
      },
    })
    k1Round1 = focusRounds.find((r) => r.league.slug === "kleague1") ?? null
    k2Round1 = focusRounds.find((r) => r.league.slug === "kleague2") ?? null
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2022") {
      // DB에 아직 seasonId/isFocus 컬럼이 없으면 라운드 조회 불가 → null 유지, 메인에 Focus Round 미표시
      k1Round1 = null
      k2Round1 = null
    } else {
      throw e
    }
  }

  const toCard = (m: {
    id: string
    playedAt: Date | null
    venue: string | null
    roundOrder: number
    round: { slug: string; league: { slug: string; season: { year: number } } }
    homeTeam: { slug: string | null; emblemPath: string | null }
    awayTeam: { slug: string | null; emblemPath: string | null }
  }) => {
    const d = m.playedAt ? new Date(m.playedAt) : null
    const dateStr = d
      ? `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`
      : ""
    const timeStr = d
      ? `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
      : ""
    return {
      id: m.id,
      matchPath: getMatchDetailPath(m),
      date: dateStr,
      timeStr,
      venue: m.venue ?? "",
      homeName: shortNameFromSlug(m.homeTeam.slug),
      awayName: shortNameFromSlug(m.awayTeam.slug),
      homeEmblem: m.homeTeam.emblemPath ?? "",
      awayEmblem: m.awayTeam.emblemPath ?? "",
    }
  }

  const k1Matches = k1Round1?.matches?.map(toCard) ?? []
  const k2Matches = k2Round1?.matches?.map(toCard) ?? []
  const hasFocusRound = k1Matches.length > 0 || k2Matches.length > 0

  // Hot moments: top by seeVarCount (isFocus 있을 때만 표시)
  // If Moment table does not exist (e.g. migration not run), use empty array.
  let hotMoments: Array<{
    rank: number
    momentId: string
    matchId: string
    league: string
    homeName: string
    awayName: string
    homeEmblem: string
    awayEmblem: string
    time: string
    varCount: number
    commentCount: number
  }> = []
  try {
    const rows = await prisma.moment.findMany({
      take: 10,
      orderBy: { seeVarCount: "desc" },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            round: { include: { league: true } },
          },
        },
      },
    })
    hotMoments = rows.map((mom, i) => ({
      rank: i + 1,
      momentId: mom.id,
      matchId: mom.matchId,
      league: mom.match.round.league.name.toUpperCase(),
      homeName: shortNameFromSlug(mom.match.homeTeam.slug),
      awayName: shortNameFromSlug(mom.match.awayTeam.slug),
      homeEmblem: mom.match.homeTeam.emblemPath ?? "",
      awayEmblem: mom.match.awayTeam.emblemPath ?? "",
      time: mom.title ?? `${mom.startMinute ?? 0}' ~ ${mom.endMinute ?? 0}'`,
      varCount: mom.seeVarCount,
      commentCount: mom.commentCount,
    }))
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code !== "P2021") throw e
  }

  return (
    <>
      {hasFocusRound ? (
        <>
          <HotMomentsSection hotMoments={hotMoments} />
          <LeagueMatchesSection k1Matches={k1Matches} k2Matches={k2Matches} />
        </>
      ) : (
        <HomeEmptyState />
      )}
    </>
  )
}
