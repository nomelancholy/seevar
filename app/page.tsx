import { prisma } from "@/lib/prisma"
import { shortNameFromSlug } from "@/lib/team-short-names"
import { getMatchDetailPathWithBack } from "@/lib/match-url"
import { HotMomentsSection } from "@/components/home/HotMomentsSection"
import { LeagueMatchesSection } from "@/components/home/LeagueMatchesSection"
import { HomeEmptyState } from "@/components/home/HomeEmptyState"

type RoundWithMatches = Awaited<
  ReturnType<
    typeof prisma.round.findMany<{
      where: { isFocus: true }
      include: {
        league: true
        matches: {
          include: {
            homeTeam: true
            awayTeam: true
            round: { include: { league: { include: { season: true } } } }
          }
          orderBy: { playedAt: "asc" }
        }
      }
    }>
  >
>[number] | null

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
    // K리그1/2 슬러그: kleague1, k-league1 등 모두 허용
    const k1Slugs = ["kleague1", "k-league1", "k-league-1"]
    const k2Slugs = ["kleague2", "k-league2", "k-league-2"]
    k1Round1 = focusRounds.find((r) => k1Slugs.includes(r.league.slug)) ?? null
    k2Round1 = focusRounds.find((r) => k2Slugs.includes(r.league.slug)) ?? null
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
    const tz = "Asia/Seoul"
    const dateStr = d
      ? new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
          .format(d)
          .replace(/-/g, "/")
      : ""
    const timeStr = d
      ? new Intl.DateTimeFormat("ko-KR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d)
      : ""
    return {
      id: m.id,
      matchPath: getMatchDetailPathWithBack(m, "/"),
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
  // 포커스 라운드가 DB에 설정되어 있으면 표시 (경기 개수와 무관)
  const hasFocusRound = k1Round1 !== null || k2Round1 !== null

  // Hot moments: 포커스 라운드에 속한 경기의 모멘트만, seeVarCount 기준 상위
  const focusMatchIds = [
    ...(k1Round1?.matches?.map((m) => m.id) ?? []),
    ...(k2Round1?.matches?.map((m) => m.id) ?? []),
  ]
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
  if (focusMatchIds.length > 0) {
    try {
      const rows = await prisma.moment.findMany({
        where: { matchId: { in: focusMatchIds } },
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
  }

  return (
    <>
      {hasFocusRound ? (
        <>
          <HotMomentsSection hotMoments={hotMoments} />
          <LeagueMatchesSection
            k1Matches={k1Matches}
            k2Matches={k2Matches}
            hasK1Focus={k1Round1 !== null}
            hasK2Focus={k2Round1 !== null}
          />
        </>
      ) : (
        <HomeEmptyState />
      )}
    </>
  )
}
