import Link from "next/link"
import { unstable_cache } from "next/cache"
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
      where: { leagueId: league.id, slug: roundSlug },
      include: { league: { include: { season: true } } },
    }))

  const seasonId = season.id
  const leagueId = league?.id
  const roundId = round?.id

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

  const ROLE_LABEL: Record<string, string> = {
    MAIN: "MAIN",
    ASSISTANT: "ASST",
    VAR: "VAR",
    WAITING: "4TH",
  }

  type MatchWithRound = Awaited<
    ReturnType<
      typeof prisma.match.findMany<{
        include: {
          homeTeam: true
          awayTeam: true
          round: { include: { league: true } }
          matchReferees: { include: { referee: true }; orderBy: { role: "asc" } }
        }
      }>
    >
  >[number]

  let seasons: { year: number; name: string }[] = []
  let leagues: { slug: string; name: string }[] = []
  let roundsForFilter: { slug: string; number: number }[] = []
  let matches: MatchWithRound[] = []
  let rawHotMoments: MomentWithMatch[] = []
  let bestReferee: { refereeId: string; name: string; role: string; avg: number } | null = null
  let worstReferee: { refereeId: string; name: string; role: string; avg: number } | null = null
  let bestRefFeedbacks: {
    id: string
    userName: string
    teamName: string | null
    teamSlug: string | null
    teamEmblem: string | null
    likeCount: number
    comment: string
    matchLabel: string
  }[] = []
  let worstRefFeedbacks: {
    id: string
    userName: string
    teamName: string | null
    teamSlug: string | null
    teamEmblem: string | null
    likeCount: number
    comment: string
    matchLabel: string
  }[] = []

  const getRoundDataCached = unstable_cache(
    async (roundIdParam: string, seasonIdParam: string) => {
      const [matchesRes, rawHotMomentsRes, reviewsRes] = await Promise.all([
        prisma.match.findMany({
          where: {
            roundId: roundIdParam,
            round: { league: { seasonId: seasonIdParam } },
          },
          take: 100,
          orderBy: { playedAt: "desc" },
          include: {
            homeTeam: true,
            awayTeam: true,
            round: { include: { league: { include: { season: true } } } },
            matchReferees: { include: { referee: true }, orderBy: { role: "asc" } },
          },
        }),
        prisma.moment
          .findMany({
            where: {
              match: {
                roundId: roundIdParam,
                round: { league: { seasonId: seasonIdParam } },
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
        prisma.refereeReview.findMany({
          where: {
            status: "VISIBLE",
            match: {
              roundId: roundIdParam,
              round: { league: { seasonId: seasonIdParam } },
            },
          },
          include: {
            referee: true,
            match: {
              include: {
                homeTeam: true,
                awayTeam: true,
              },
            },
            fanTeam: {
              select: { name: true, slug: true, emblemPath: true },
            },
            user: {
              select: { name: true },
            },
            reactions: {
              select: { type: true },
            },
          },
        }),
      ])

      return { matchesRes, rawHotMomentsRes, reviewsRes }
    },
    ["archive-round"],
    { revalidate: 60 },
  )

  // 필터: 시즌 → 해당 시즌의 모든 리그 → 해당 리그의 모든 라운드 (경기 일자와 무관하게 시즌 구조 기준으로 노출)
  const [seasonsRes, leaguesRes] = await Promise.all([
    prisma.season.findMany({
      where: { leagues: { some: {} } },
      orderBy: { year: "desc" },
    }),
    prisma.league.findMany({
      where: { seasonId },
      orderBy: { slug: "asc" },
      select: { slug: true, name: true },
    }),
  ])
  seasons = seasonsRes.map((s) => ({ year: s.year, name: String(s.year) }))
  leagues = leaguesRes.map((l) => ({ slug: l.slug, name: l.name }))

  let roundsRes: { slug: string; number: number }[] = []
  if (leagueId) {
    const rows = await prisma.round.findMany({
      where: { leagueId },
      orderBy: { number: "asc" },
      select: { slug: true, number: true },
    })
    roundsRes = rows
  }
  roundsForFilter = roundsRes

  if (roundId) {
    const { matchesRes, rawHotMomentsRes, reviewsRes } = await getRoundDataCached(roundId, seasonId)
    matches = matchesRes
    rawHotMoments = rawHotMomentsRes

    // ROUND BEST / WORST REFEREE (평균 평점 기준) + TOP FAN FEEDBACKS
    if (reviewsRes.length > 0) {
      const byRef = new Map<
        string,
        {
          refereeId: string
          name: string
          role: string
          sum: number
          count: number
          reviews: {
            id: string
            userName: string
            teamName: string | null
            teamSlug: string | null
            teamEmblem: string | null
            likeCount: number
            comment: string
            matchLabel: string
          }[]
        }
      >()
      for (const r of reviewsRes) {
        const key = `${r.refereeId}:${r.role}`
        const cur = byRef.get(key)
        const likeCount = r.reactions.filter((rx) => rx.type === "LIKE").length
        const homeName = r.match.homeTeam.name
        const awayName = r.match.awayTeam.name
        const matchLabel = `${homeName} vs ${awayName}`
        if (r.comment) {
          const summary = {
            id: r.id,
            userName: r.user?.name || "Supporter",
            teamName: r.fanTeam?.name ?? null,
            teamSlug: r.fanTeam?.slug ?? null,
            teamEmblem: r.fanTeam?.emblemPath ?? null,
            likeCount,
            comment: r.comment,
            matchLabel,
          }
          if (cur) {
            cur.reviews.push(summary)
          } else {
            byRef.set(key, {
              refereeId: r.refereeId,
              name: r.referee.name,
              role: r.role,
              sum: r.rating,
              count: 1,
              reviews: [summary],
            })
            continue
          }
        }
        if (cur) {
          cur.sum += r.rating
          cur.count += 1
        } else {
          byRef.set(key, {
            refereeId: r.refereeId,
            name: r.referee.name,
            role: r.role,
            sum: r.rating,
            count: 1,
            reviews: [],
          })
        }
      }
      const stats = [...byRef.values()].map((v) => ({
        refereeId: v.refereeId,
        name: v.name,
        role: v.role,
        avg: v.count > 0 ? v.sum / v.count : 0,
        reviews: v.reviews.sort((a, b) => b.likeCount - a.likeCount).slice(0, 3),
      }))

      if (stats.length > 0) {
        const byBest = [...stats].sort((a, b) => b.avg - a.avg)
        const byWorst = [...stats].sort((a, b) => a.avg - b.avg)
        const best = byBest[0]
        const worst = byWorst[0]
        bestReferee = { refereeId: best.refereeId, name: best.name, role: best.role, avg: best.avg }
        worstReferee = { refereeId: worst.refereeId, name: worst.name, role: worst.role, avg: worst.avg }
        bestRefFeedbacks = best.reviews
        worstRefFeedbacks = worst.reviews
      }
    }
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

  const getYouTubeEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null
    try {
      const u = new URL(url)
      let id: string | null = null
      if (u.hostname.includes("youtu.be")) {
        id = u.pathname.replace("/", "")
      } else if (u.hostname.includes("youtube.com")) {
        id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).at(-1) || null
      }
      if (!id) return null
      return `https://www.youtube.com/embed/${id}`
    } catch {
      return null
    }
  }

  const getInstagramEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null
    try {
      const u = new URL(url)
      const parts = u.pathname.split("/").filter(Boolean)
      if (parts.length < 2) return null
      const type = parts[0] // p, reel, tv 등
      const code = parts[1]
      if (!code) return null
      return `https://www.instagram.com/${type}/${code}/embed/`
    } catch {
      return null
    }
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl((round as { youtubeUrl?: string | null } | null)?.youtubeUrl)
  const instagramEmbedUrl = getInstagramEmbedUrl(
    (round as { instagramUrl?: string | null } | null)?.instagramUrl
  )

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

      {/* ROUND BEST / WORST REFEREE */}
      {bestReferee && worstReferee && (
        <section className="mb-8 md:mb-12 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* BEST */}
          <div className="ledger-surface p-4 md:p-6 border-l-4 border-[#00ff41]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-mono text-[8px] md:text-[10px] font-black tracking-widest text-[#00ff41] uppercase mb-1">
                  Round Best Referee
                </h2>
                <Link
                  href={`/referees/${bestReferee.refereeId}`}
                  className="text-xl md:text-2xl font-black italic uppercase leading-none hover:text-[#00ff41] transition-colors"
                >
                  {bestReferee.name}
                </Link>
                <div className="mt-3 flex items-center gap-2">
                  <span className="bg-zinc-800 text-white px-2 py-0.5 text-[8px] md:text-[9px] font-bold font-mono uppercase">
                    {ROLE_LABEL[bestReferee.role] ?? bestReferee.role}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-[#00ff41] text-black px-2 py-0.5 text-[7px] md:text-[8px] font-black uppercase">
                  Top Rated
                </span>
                <p className="font-mono text-[9px] md:text-[10px] text-zinc-500 mt-1">
                  AVG: {bestReferee.avg.toFixed(1)} / 5.0
                </p>
              </div>
            </div>

            {bestRefFeedbacks.length > 0 && (
              <div className="space-y-4">
                <p className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
                  Top Fan Feedbacks
                </p>
                {bestRefFeedbacks.map((fb) => (
                  <div key={fb.id} className="bg-zinc-900/50 p-3 border border-zinc-800">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="relative">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 flex items-center justify-center">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {fb.userName.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          {fb.teamEmblem && (
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full border border-zinc-900 flex items-center justify-center p-0.5 shadow-lg z-10">
                              <img src={fb.teamEmblem} alt={fb.teamName ?? ""} className="w-full h-full" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] font-black italic text-white">
                            {fb.userName}
                          </span>
                          {fb.teamName && (
                            <span className="text-[7px] md:text-[8px] font-mono text-zinc-500 uppercase">
                              {fb.teamName} SUPPORTING
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-blue-400">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span className="font-mono text-[7px] md:text-[8px] font-black">{fb.likeCount}</span>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-zinc-300 italic leading-relaxed">{fb.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WORST */}
          <div className="ledger-surface p-4 md:p-6 border-l-4 border-red-600">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-mono text-[8px] md:text-[10px] font-black tracking-widest text-red-500 uppercase mb-1">
                  Round Worst Referee
                </h2>
                <Link
                  href={`/referees/${worstReferee.refereeId}`}
                  className="text-xl md:text-2xl font-black italic uppercase leading-none hover:text-red-500 transition-colors"
                >
                  {worstReferee.name}
                </Link>
                <div className="mt-3 flex items-center gap-2">
                  <span className="bg-zinc-800 text-white px-2 py-0.5 text-[8px] md:text-[9px] font-bold font-mono uppercase">
                    {ROLE_LABEL[worstReferee.role] ?? worstReferee.role}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-red-600 text-white px-2 py-0.5 text-[7px] md:text-[8px] font-black uppercase">
                  Low Rated
                </span>
                <p className="font-mono text-[9px] md:text-[10px] text-zinc-500 mt-1">
                  AVG: {worstReferee.avg.toFixed(1)} / 5.0
                </p>
              </div>
            </div>

            {worstRefFeedbacks.length > 0 && (
              <div className="space-y-4">
                <p className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
                  Top Fan Feedbacks
                </p>
                {worstRefFeedbacks.map((fb) => (
                  <div key={fb.id} className="bg-zinc-900/50 p-3 border border-zinc-800">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="relative">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 flex items-center justify-center">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {fb.userName.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          {fb.teamEmblem && (
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full border border-zinc-900 flex items-center justify-center p-0.5 shadow-lg z-10">
                              <img src={fb.teamEmblem} alt={fb.teamName ?? ""} className="w-full h-full" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] font-black italic text-white">
                            {fb.userName}
                          </span>
                          {fb.teamName && (
                            <span className="text-[7px] md:text-[8px] font-mono text-zinc-500 uppercase">
                              {fb.teamName} SUPPORTING
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-blue-400">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span className="font-mono text-[7px] md:text-[8px] font-black">{fb.likeCount}</span>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-zinc-300 italic leading-relaxed">{fb.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* HOT MOMENTS */}
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
                <div className="col-span-7 flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-4 md:gap-8">
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
                  {"matchReferees" in m && Array.isArray(m.matchReferees) && m.matchReferees.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[9px] md:text-[10px] text-muted-foreground">
                      {m.matchReferees.map((mr: { role: string; referee: { name: string } }) => (
                        <span key={`${mr.role}-${mr.referee.name}`}>
                          <span className="uppercase font-bold text-foreground/80">{ROLE_LABEL[mr.role] ?? mr.role}</span>
                          <span className="mx-1">·</span>
                          <span>{mr.referee.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
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

      {/* ROUND MEDIA ARCHIVE - 페이지 가장 하단 */}
      {(youtubeEmbedUrl || instagramEmbedUrl) && (
        <section className="mt-8 md:mt-12">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-4">
            ROUND MEDIA ARCHIVE
          </h2>
          <div className="flex flex-col gap-4 md:gap-6">
            {youtubeEmbedUrl && (
              <div className="border border-border bg-card/60 p-3 md:p-4">
                <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Round Review · YouTube
                </p>
                <div className="relative w-full pt-[56.25%] bg-black border border-border overflow-hidden">
                  <iframe
                    src={youtubeEmbedUrl}
                    title="Round review video"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            {instagramEmbedUrl && (
              <div className="border border-border bg-card/60 p-3 md:p-4">
                <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Card News · Instagram
                </p>
                <div className="relative w-full pt-[125%] bg-black border border-border overflow-hidden">
                  <iframe
                    src={instagramEmbedUrl}
                    title="Round card news"
                    className="absolute inset-0 w-full h-full"
                    allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
