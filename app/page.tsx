import Link from "next/link"
import { unstable_cache } from "next/cache"
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
        league: { include: { season: true } }
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

type RefFeedback = {
  id: string
  userName: string
  teamName: string | null
  teamSlug: string | null
  teamEmblem: string | null
  likeCount: number
  comment: string
  matchLabel: string
}

type RoundHighlight = {
  leagueName: string
  roundNumber: number
  bestReferee:
    | {
        id: string
        name: string
        role: string
        avg: number
        feedbacks: RefFeedback[]
      }
    | null
  worstReferee:
    | {
        id: string
        name: string
        role: string
        avg: number
        feedbacks: RefFeedback[]
      }
    | null
  youtubeEmbedUrl: string | null
  instagramEmbedUrl: string | null
}

const getFocusRoundsCached = unstable_cache(
  async () =>
    prisma.round.findMany({
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
    }),
  ["home-focus-rounds"],
  { revalidate: 60 },
)

export default async function HomePage() {
  // 메인에는 isFocus === true 인 라운드만 표시 (없으면 Focus Round 섹션 비표시)
  let k1Round1: RoundWithMatches = null
  let k2Round1: RoundWithMatches = null
  try {
    const focusRounds = await getFocusRoundsCached()
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

  async function buildHighlight(round: RoundWithMatches | null): Promise<RoundHighlight | null> {
    if (!round) return null

    const reviews = await prisma.refereeReview.findMany({
      where: {
        status: "VISIBLE",
        match: {
          roundId: round.id,
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
    })

    let bestReferee: RoundHighlight["bestReferee"] = null
    let worstReferee: RoundHighlight["worstReferee"] = null

    if (reviews.length > 0) {
      const byRef = new Map<
        string,
        {
          id: string
          name: string
          role: string
          sum: number
          count: number
          feedbacks: RefFeedback[]
        }
      >()

      for (const r of reviews) {
        const key = `${r.refereeId}:${r.role}`
        const cur = byRef.get(key)
        const likeCount = r.reactions.filter((rx) => rx.type === "LIKE").length
        const homeName = r.match.homeTeam.name
        const awayName = r.match.awayTeam.name
        const matchLabel = `${homeName} vs ${awayName}`

        const baseFeedback: RefFeedback | null = r.comment
          ? {
              id: r.id,
              userName: r.user?.name || "Supporter",
              teamName: r.fanTeam?.name ?? null,
              teamSlug: r.fanTeam?.slug ?? null,
              teamEmblem: r.fanTeam?.emblemPath ?? null,
              likeCount,
              comment: r.comment,
              matchLabel,
            }
          : null

        if (cur) {
          cur.sum += r.rating
          cur.count += 1
          if (baseFeedback) cur.feedbacks.push(baseFeedback)
        } else {
          byRef.set(key, {
            id: r.refereeId,
            name: r.referee.name,
            role: r.role,
            sum: r.rating,
            count: 1,
            feedbacks: baseFeedback ? [baseFeedback] : [],
          })
        }
      }

      const stats = [...byRef.values()].map((v) => ({
        id: v.id,
        name: v.name,
        role: v.role,
        avg: v.count > 0 ? v.sum / v.count : 0,
        feedbacks: v.feedbacks.sort((a, b) => b.likeCount - a.likeCount).slice(0, 3),
      }))

      if (stats.length > 0) {
        const byBest = [...stats].sort((a, b) => b.avg - a.avg)
        const byWorst = [...stats].sort((a, b) => a.avg - b.avg)
        const best = byBest[0]
        const worst = byWorst[0]
        bestReferee = best
        worstReferee = worst
      }
    }

    const youtubeEmbedUrl = getYouTubeEmbedUrl((round as { youtubeUrl?: string | null }).youtubeUrl ?? null)
    const instagramEmbedUrl = getInstagramEmbedUrl(
      (round as { instagramUrl?: string | null }).instagramUrl ?? null
    )

    if (!bestReferee && !worstReferee && !youtubeEmbedUrl && !instagramEmbedUrl) {
      return null
    }

    return {
      leagueName: round.league.name,
      roundNumber: round.number,
      bestReferee,
      worstReferee,
      youtubeEmbedUrl,
      instagramEmbedUrl,
    }
  }

  const [k1Highlight, k2Highlight] = await Promise.all([buildHighlight(k1Round1), buildHighlight(k2Round1)])

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
          {(k1Highlight || k2Highlight) && (
            <section className="mb-8 md:mb-12">
              <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
                Focus Round Highlights
              </h2>
              <div className="space-y-8">
                {[k1Highlight, k2Highlight].map(
                  (h) =>
                    h && (
                      <div key={`${h.leagueName}-${h.roundNumber}`} className="space-y-4">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                          {h.leagueName} · Round {h.roundNumber}
                        </p>

                        {h.bestReferee && h.worstReferee && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-4">
                            {/* BEST */}
                            <div className="ledger-surface p-4 md:p-6 border-l-4 border-[#00ff41]">
                              <div className="flex justify-between items-start mb-6">
                                <div>
                                  <p className="font-mono text-[8px] md:text-[10px] font-black tracking-widest text-[#00ff41] uppercase mb-1">
                                    Round Best Referee
                                  </p>
                                  <Link
                                    href={`/referees/${h.bestReferee.id}`}
                                    className="text-xl md:text-2xl font-black italic uppercase leading-none hover:text-[#00ff41] transition-colors"
                                  >
                                    {h.bestReferee.name}
                                  </Link>
                                  <div className="mt-3 flex items-center gap-2">
                                    <span className="bg-zinc-800 text-white px-2 py-0.5 text-[8px] md:text-[9px] font-bold font-mono uppercase">
                                      {h.bestReferee.role}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="bg-[#00ff41] text-black px-2 py-0.5 text-[7px] md:text-[8px] font-black uppercase">
                                    Top Rated
                                  </span>
                                  <p className="font-mono text-[9px] md:text-[10px] text-zinc-500 mt-1">
                                    AVG: {h.bestReferee.avg.toFixed(1)} / 5.0
                                  </p>
                                </div>
                              </div>

                              {h.bestReferee.feedbacks.length > 0 && (
                                <div className="space-y-4">
                                  <p className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
                                    Top Fan Feedbacks
                                  </p>
                                  {h.bestReferee.feedbacks.map((fb) => (
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
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                  <p className="font-mono text-[8px] md:text-[10px] font-black tracking-widest text-red-500 uppercase mb-1">
                                    Round Worst Referee
                                  </p>
                                  <Link
                                    href={`/referees/${h.worstReferee.id}`}
                                    className="text-xl md:text-2xl font-black italic uppercase leading-none hover:text-red-500 transition-colors"
                                  >
                                    {h.worstReferee.name}
                                  </Link>
                                  <div className="mt-3 flex items-center gap-2">
                                    <span className="bg-zinc-800 text-white px-2 py-0.5 text-[8px] md:text-[9px] font-bold font-mono uppercase">
                                      {h.worstReferee.role}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="bg-red-600 text-white px-2 py-0.5 text-[7px] md:text-[8px] font-black uppercase">
                                    Low Rated
                                  </span>
                                  <p className="font-mono text-[9px] md:text-[10px] text-zinc-500 mt-1">
                                    AVG: {h.worstReferee.avg.toFixed(1)} / 5.0
                                  </p>
                                </div>
                              </div>

                              {h.worstReferee.feedbacks.length > 0 && (
                                <div className="space-y-4">
                                  <p className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
                                    Top Fan Feedbacks
                                  </p>
                                  {h.worstReferee.feedbacks.map((fb) => (
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
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          </div>
                        )}

                      </div>
                    ),
                )}
              </div>
            </section>
          )}

          <HotMomentsSection hotMoments={hotMoments} />
          <LeagueMatchesSection
            k1Matches={k1Matches}
            k2Matches={k2Matches}
            hasK1Focus={k1Round1 !== null}
            hasK2Focus={k2Round1 !== null}
          />

          {/* ROUND MEDIA ARCHIVE - 메인 페이지 가장 하단 */}
          {(k1Highlight?.youtubeEmbedUrl ||
            k1Highlight?.instagramEmbedUrl ||
            k2Highlight?.youtubeEmbedUrl ||
            k2Highlight?.instagramEmbedUrl) && (
            <section className="mb-8 md:mb-12">
              <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
                ROUND MEDIA ARCHIVE
              </h2>
              <div className="space-y-8">
                {[k1Highlight, k2Highlight].map(
                  (h) =>
                    h &&
                    (h.youtubeEmbedUrl || h.instagramEmbedUrl) && (
                      <div key={`${h.leagueName}-${h.roundNumber}`} className="space-y-3 md:space-y-4">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                          {h.leagueName} · Round {h.roundNumber}
                        </p>
                        <div className="flex flex-col gap-4 md:gap-6">
                          {h.youtubeEmbedUrl && (
                            <div className="border border-border bg-card/60 p-3 md:p-4">
                              <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                                Round Review · YouTube
                              </p>
                              <div className="relative w-full pt-[56.25%] bg-black border border-border overflow-hidden">
                                <iframe
                                  src={h.youtubeEmbedUrl}
                                  title="Round review video"
                                  className="absolute inset-0 w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          )}
                          {h.instagramEmbedUrl && (
                            <div className="border border-border bg-card/60 p-3 md:p-4">
                              <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                                Card News · Instagram
                              </p>
                              <div className="relative w-full pt-[125%] bg-black border border-border overflow-hidden">
                                <iframe
                                  src={h.instagramEmbedUrl}
                                  title="Round card news"
                                  className="absolute inset-0 w-full h-full"
                                  allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                )}
              </div>
            </section>
          )}
        </>
      ) : (
        <HomeEmptyState />
      )}
    </>
  )
}
