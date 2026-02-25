import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { deriveMatchStatus } from "@/lib/utils/match-status"
import { shortNameFromSlug } from "@/lib/team-short-names"
import { ArchiveFilters } from "@/components/matches/ArchiveFilters"
import { HotMomentsSection } from "@/components/home/HotMomentsSection"
import { getMatchDetailPathWithBack, type MatchForPath } from "@/lib/match-url"

export const metadata = {
  title: "MATCH CENTER | See VAR",
  description: "시즌별, 라운드별 경기 일정 및 VAR 판정 데이터",
}

type Params = Promise<{ year: string; leagueSlug: string; roundSlug: string }>

export default async function MatchesArchivePage({ params }: { params: Params }) {
  const { year: yearStr, leagueSlug, roundSlug } = await params
  const year = parseInt(yearStr, 10)
  if (Number.isNaN(year) || yearStr.length !== 4) notFound()

  const season = await prisma.season.findUnique({ where: { year } })
  if (!season) notFound()

  const hasLeagueSlug = leagueSlug && leagueSlug !== "_"
  const league = hasLeagueSlug
    ? await prisma.league.findFirst({
        where: { seasonId: season.id, slug: leagueSlug } as { seasonId: string; slug: string },
      })
    : null
  const round =
    league &&
    (await prisma.round.findFirst({
      where: { leagueId: league.id, slug: roundSlug, isFocus: false } as { leagueId: string; slug: string; isFocus: boolean },
      include: { league: { include: { season: true } } },
    }))

  const seasonId = season.id
  const leagueId = league?.id
  const roundId = round?.id
  const playedAtYearStart = new Date(Date.UTC(year, 0, 1))
  const playedAtYearEnd = new Date(Date.UTC(year + 1, 0, 1))

  type MomentWithMatch = Awaited<
    ReturnType<
      typeof prisma.moment.findMany<{
        include: {
          match: {
            include: { homeTeam: true; awayTeam: true; round: { include: { league: true } } }
          }
        }
      }>
    >
  >[number]

  type MatchWithRound = Awaited<
    ReturnType<
      typeof prisma.match.findMany<{
        include: {
          homeTeam: true
          awayTeam: true
          round: { include: { league: true } }
        }
      }>
    >
  >[number]

  let seasons: { year: number; name: string }[] = []
  let leagues: { slug: string; name: string }[] = []
  let roundsForFilter: { slug: string; number: number }[] = []
  let matches: MatchWithRound[] = []
  let rawHotMoments: MomentWithMatch[] = []

  // 필터 연동: 시즌(리그 있는 것만) → 리그(해당 연도에 경기 있는 아카이브 라운드만) → 라운드(해당 리그만). 리그/라운드 없으면 빈 목록.
  const [seasonsRes, leaguesRes] = await Promise.all([
    prisma.season.findMany({
      where: { leagues: { some: {} } },
      orderBy: { year: "desc" },
    }),
    prisma.league.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: {
        seasonId,
        rounds: {
          some: {
            isFocus: false,
            matches: {
              some: {
                playedAt: { gte: playedAtYearStart, lt: playedAtYearEnd },
              },
            },
          },
        },
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy: { slug: "asc" } as any,
    }),
  ])
  seasons = seasonsRes.map((s) => ({ year: s.year, name: String(s.year) }))
  leagues = leaguesRes.map((l) => ({ slug: (l as unknown as { slug: string }).slug, name: l.name }))

  let roundsRes: { slug: string; number: number }[] = []
  if (leagueId) {
    const rows = await prisma.round.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: {
        isFocus: false,
        leagueId,
        matches: {
          some: {
            playedAt: { gte: playedAtYearStart, lt: playedAtYearEnd },
          },
        },
      } as any,
      orderBy: { number: "asc" },
    })
    roundsRes = rows.map((r) => ({ slug: (r as unknown as { slug: string }).slug, number: r.number }))
  }
  roundsForFilter = roundsRes

  if (roundId) {
    const [matchesRes, rawHotMomentsRes] = await Promise.all([
      prisma.match.findMany({
        where: {
          roundId,
          round: { league: { seasonId } },
          playedAt: {
            gte: playedAtYearStart,
            lt: playedAtYearEnd,
          },
        },
        take: 100,
        orderBy: { playedAt: "desc" },
        include: {
          homeTeam: true,
          awayTeam: true,
          round: { include: { league: { include: { season: true } } } },
        },
      }),
      prisma.moment
        .findMany({
          where: {
            match: {
              roundId,
              round: { league: { seasonId } },
              playedAt: {
                gte: playedAtYearStart,
                lt: playedAtYearEnd,
              },
            },
          },
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
        .catch((e: { code?: string }) => (e?.code === "P2021" ? [] : Promise.reject(e))),
    ])
    matches = matchesRes
    rawHotMoments = rawHotMomentsRes
  }

  const hotList = rawHotMoments.map((mom, i) => {
    const homeTeam = mom.match.homeTeam as unknown as { name: string; slug: string | null; emblemPath: string | null }
    const awayTeam = mom.match.awayTeam as unknown as { name: string; slug: string | null; emblemPath: string | null }
    return {
    rank: i + 1,
    momentId: mom.id,
    matchId: mom.matchId,
    league: mom.match.round.league.name.toUpperCase(),
    homeName: shortNameFromSlug(homeTeam.slug),
    awayName: shortNameFromSlug(awayTeam.slug),
    homeEmblem: homeTeam.emblemPath ?? "",
    awayEmblem: awayTeam.emblemPath ?? "",
    time: mom.title ?? `${mom.startMinute ?? 0}' ~ ${mom.endMinute ?? 0}'`,
    varCount: mom.seeVarCount,
    commentCount: mom.commentCount,
  }
  })

  const formatDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).replace(/\. /g, "/").replace(".", "")
      : "—"
  const formatTime = (d: Date | null) =>
    d
      ? new Date(d).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "—"

  return (
    <main className="py-8 md:py-12">
      <header className="mb-8 md:mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
            MATCH CENTER
          </h1>
          <p className="font-mono text-xs md:text-sm text-muted-foreground">
            시즌별, 라운드별 경기 일정 및 VAR 판정 데이터를 확인하세요.
          </p>
        </div>
        <Suspense fallback={<div className="h-10 w-48 bg-card border border-border animate-pulse" />}>
          <ArchiveFilters
            seasons={seasons}
            leagues={leagues}
            rounds={roundsForFilter}
            currentYear={year}
            currentLeagueSlug={leagueSlug}
            currentRoundSlug={roundSlug}
          />
        </Suspense>
      </header>

      {hotList.length === 0 ? (
        <section className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
            HOT MOMENTS OF THIS ROUND
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            등록된 모멘트가 없습니다.
          </p>
        </section>
      ) : (
        <HotMomentsSection hotMoments={hotList} title="HOT MOMENTS OF THIS ROUND" />
      )}

      <div className="ledger-surface overflow-hidden">
        <div className="grid grid-cols-12 bg-card/50 p-4 border-b border-border font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <div className="col-span-2">Date / Time</div>
          <div className="col-span-1 text-center">League</div>
          <div className="col-span-7 text-center">Matchup</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        <div className="divide-y divide-border">
          {matches.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              등록된 경기가 없습니다.
            </div>
          ) : (
            matches.map((m) => (
              <Link
                key={m.id}
                href={getMatchDetailPathWithBack(m as unknown as MatchForPath, `/matches/archive/${yearStr}/${leagueSlug}/${roundSlug}`)}
                className="grid grid-cols-12 p-4 md:p-6 items-center match-row group"
              >
                <div className="col-span-2">
                  <p className="font-mono text-xs font-bold">{formatDate(m.playedAt)}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {formatTime(m.playedAt)} KST
                  </p>
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className={
                      (m.round.league as unknown as { slug: string }).slug === "supercup"
                        ? "bg-amber-600/90 text-white px-2 py-0.5 text-[9px] font-black italic"
                        : (m.round.league as unknown as { slug: string }).slug === "kleague1"
                          ? "bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-black italic"
                          : "bg-muted text-primary px-2 py-0.5 text-[9px] font-black italic"
                    }
                  >
                    {(m.round.league as unknown as { slug: string }).slug === "supercup"
                      ? "SUPER CUP"
                      : (m.round.league as unknown as { slug: string }).slug === "kleague1"
                        ? "K1"
                        : "K2"}
                  </span>
                </div>
                <div className="col-span-7 flex items-center justify-center gap-4 md:gap-8">
                  <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end">
                    <span className="font-black italic text-sm md:text-lg uppercase truncate">
                      {m.homeTeam.name}
                    </span>
                    {(m.homeTeam as unknown as { emblemPath: string | null }).emblemPath && (
                      <img
                        src={(m.homeTeam as unknown as { emblemPath: string | null }).emblemPath!}
                        alt=""
                        className="w-6 h-6 md:w-8 md:h-8 shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    {(() => {
                      const status = deriveMatchStatus(m.playedAt, { storedStatus: m.status })
                      return status === "LIVE" && m.scoreHome != null && m.scoreAway != null ? (
                        <>
                          <span className="text-xl md:text-2xl font-black italic tracking-tighter">
                            {m.scoreHome} : {m.scoreAway}
                          </span>
                          <span className="font-mono text-[8px] text-primary font-bold">LIVE</span>
                        </>
                      ) : status === "FINISHED" && m.scoreHome != null && m.scoreAway != null ? (
                        <>
                          <span className="text-xl md:text-2xl font-black italic tracking-tighter">
                            {m.scoreHome} : {m.scoreAway}
                          </span>
                          <span className="font-mono text-[8px] text-muted-foreground font-bold uppercase">
                            Finished
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">VS</span>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-1 justify-start">
                    {(m.awayTeam as unknown as { emblemPath: string | null }).emblemPath && (
                      <img
                        src={(m.awayTeam as unknown as { emblemPath: string | null }).emblemPath!}
                        alt=""
                        className="w-6 h-6 md:w-8 md:h-8 shrink-0"
                      />
                    )}
                    <span className="font-black italic text-sm md:text-lg uppercase truncate">
                      {m.awayTeam.name}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <span className="border border-border px-4 py-2 text-[10px] font-bold font-mono group-hover:bg-foreground group-hover:text-background transition-all inline-block">
                    INSIDE GAME
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
