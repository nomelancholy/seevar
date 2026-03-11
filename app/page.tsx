import Link from "next/link"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { shortNameFromSlug } from "@/lib/team-short-names"
import { getMatchDetailPath, getMatchDetailPathWithBack, type MatchForPath } from "@/lib/match-url"
import { formatMatchMinuteForDisplay, formatMomentTimeFromPeriod } from "@/lib/utils/format-match-minute"
import { TextWithEmbedPreview } from "@/components/embed/TextWithEmbedPreview"
import { HotMomentsSection } from "@/components/home/HotMomentsSection"
import { LeagueMatchesSection } from "@/components/home/LeagueMatchesSection"
import { RoundRefereeBestWorstSection } from "@/components/home/RoundRefereeBestWorstSection"
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
          orderBy: [{ playedAt: "asc" }, { roundOrder: "asc" }]
        }
      }
    }>
  >
>[number] | null

type RefFeedback = {
  id: string
  userName: string
  userHandle?: string | null
  userImage: string | null
  teamName: string | null
  teamSlug: string | null
  teamEmblem: string | null
  likeCount: number
  comment: string
  matchLabel: string
  /** 이 한줄평 작성자가 부여한 평점 (1~5) */
  rating: number
}

type RoundRefereeStat = {
  id: string
  slug: string
  name: string
  role: string
  avg: number
  voteCount: number
  matchForDisplay?: {
    homeName: string
    awayName: string
    matchPath: string
    homeEmblemPath?: string | null
    awayEmblemPath?: string | null
  }
  homeAvg?: number
  awayAvg?: number
}

/** 역할별 베스트/워스트 카드용 (RoundRefereeBestWorstSection과 동일한 구조) */
type RefereeCardPayload = {
  refereeId: string
  slug: string
  name: string
  role: string
  avg: number
  voteCount: number
  /** 같은 경기·같은 역할·동일 평점인 다른 심판 (이름, 슬러그) */
  peerRefs?: { name: string; slug: string }[]
  matchForDisplay?: {
    homeName: string
    awayName: string
    matchPath: string
    homeEmblemPath?: string | null
    awayEmblemPath?: string | null
  }
  reviews: {
    id: string
    userName: string
    userHandle?: string | null
    userImage: string | null
    teamName: string | null
    teamSlug: string | null
    teamEmblem: string | null
    likeCount: number
    comment: string
    matchLabel: string
    rating: number
  }[]
}

type RoundHighlight = {
  leagueName: string
  roundNumber: number
  bestByRole: Partial<Record<string, RefereeCardPayload>>
  worstByRole: Partial<Record<string, RefereeCardPayload>>
  allRoundReferees: RoundRefereeStat[]
  youtubeEmbedUrl: string | null
  instagramEmbedUrl: string | null
}

const getFocusRoundsCached = unstable_cache(
  async () =>
    prisma.round.findMany({
      where: { isFocus: true },
      include: {
        league: { include: { season: true } },
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
  { revalidate: 60, tags: ["focus-rounds"] },
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
    scoreHome: number | null
    scoreAway: number | null
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
      scoreHome: m.scoreHome ?? null,
      scoreAway: m.scoreAway ?? null,
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

    let allRoundReferees: RoundRefereeStat[] = []

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
            round: { include: { league: { include: { season: true } } } },
          },
        },
        fanTeam: {
          select: { name: true, slug: true, emblemPath: true },
        },
        user: {
          select: { name: true, image: true, handle: true },
        },
        reactions: {
          select: { type: true },
        },
      },
    })

    const ROLES_FOR_BEST_WORST = ["MAIN", "VAR", "ASSISTANT", "WAITING"] as const
    let bestByRole: RoundHighlight["bestByRole"] = {}
    let worstByRole: RoundHighlight["worstByRole"] = {}

    if (reviews.length > 0) {
      const byRef = new Map<
        string,
        {
          id: string
          slug: string
          name: string
          role: string
          matchId: string
          sum: number
          count: number
          homeSum: number
          homeCount: number
          awaySum: number
          awayCount: number
          feedbacks: RefFeedback[]
          matchForDisplay: { homeName: string; awayName: string; matchPath: string }
        }
      >()

      for (const r of reviews) {
        const key = `${r.refereeId}:${r.role}`
        const cur = byRef.get(key)
        const likeCount = r.reactions.filter((rx) => rx.type === "LIKE").length
        const homeName = r.match.homeTeam.name
        const awayName = r.match.awayTeam.name
        const matchLabel = `${homeName} vs ${awayName}`
        const match = r.match as { homeTeamId: string; awayTeamId: string }
        const isHomeFan = r.fanTeamId != null && r.fanTeamId === match.homeTeamId
        const isAwayFan = r.fanTeamId != null && r.fanTeamId === match.awayTeamId

        const baseFeedback: RefFeedback | null = r.comment
          ? {
              id: r.id,
              userName: r.user?.name || "Supporter",
              userHandle: (r.user as { handle?: string | null })?.handle ?? null,
              userImage: r.user?.image ?? null,
              teamName: r.fanTeam?.name ?? null,
              teamSlug: r.fanTeam?.slug ?? null,
              teamEmblem: r.fanTeam?.emblemPath ?? null,
              likeCount,
              comment: r.comment,
              matchLabel,
              rating: r.rating,
            }
          : null

        const matchForDisplay = {
          homeName: r.match.homeTeam.name,
          awayName: r.match.awayTeam.name,
          matchPath:
            getMatchDetailPathWithBack(r.match as unknown as MatchForPath, "/") +
            "&scroll=referee-rating&referee=" +
            encodeURIComponent((r.referee as { slug: string }).slug),
          homeEmblemPath: (r.match.homeTeam as { emblemPath: string | null }).emblemPath ?? null,
          awayEmblemPath: (r.match.awayTeam as { emblemPath: string | null }).emblemPath ?? null,
        }

        if (cur) {
          cur.sum += r.rating
          cur.count += 1
          if (isHomeFan) {
            cur.homeSum += r.rating
            cur.homeCount += 1
          }
          if (isAwayFan) {
            cur.awaySum += r.rating
            cur.awayCount += 1
          }
          if (baseFeedback) cur.feedbacks.push(baseFeedback)
        } else {
          byRef.set(key, {
            id: r.refereeId,
            slug: (r.referee as { slug: string }).slug,
            name: r.referee.name,
            role: r.role,
            matchId: r.matchId,
            sum: r.rating,
            count: 1,
            homeSum: isHomeFan ? r.rating : 0,
            homeCount: isHomeFan ? 1 : 0,
            awaySum: isAwayFan ? r.rating : 0,
            awayCount: isAwayFan ? 1 : 0,
            feedbacks: baseFeedback ? [baseFeedback] : [],
            matchForDisplay,
          })
        }
      }

      const stats: RoundRefereeStat[] = [...byRef.values()].map((v) => ({
        id: v.id,
        slug: v.slug,
        name: v.name,
        role: v.role,
        matchId: v.matchId,
        avg: v.count > 0 ? v.sum / v.count : 0,
        voteCount: v.count,
        matchForDisplay: v.matchForDisplay,
        homeAvg: v.homeCount > 0 ? v.homeSum / v.homeCount : undefined,
        awayAvg: v.awayCount > 0 ? v.awaySum / v.awayCount : undefined,
      }))
      allRoundReferees = [...stats].sort((a, b) => b.avg - a.avg)

      const statsWithFeedbacks = stats.map((s) => {
        const v = byRef.get(`${s.id}:${s.role}`)!
        return {
          ...s,
          feedbacks: v.feedbacks.sort((a, b) => b.likeCount - a.likeCount).slice(0, 3),
        }
      })

      if (statsWithFeedbacks.length > 0) {
        for (const role of ROLES_FOR_BEST_WORST) {
          const byRole = statsWithFeedbacks.filter((s) => s.role === role)
          const byBest = [...byRole].sort((a, b) => {
            const diff = b.avg - a.avg
            if (Math.abs(diff) > 1e-6) return diff
            // 동일 평균이면 투표 수 많은 심판이 베스트
            return b.voteCount - a.voteCount
          })
          const byWorst = [...byRole].sort((a, b) => {
            const diff = a.avg - b.avg
            if (Math.abs(diff) > 1e-6) return diff
            // 동일 평균이면 투표 수 많은 심판이 워스트
            return b.voteCount - a.voteCount
          })
          const best = byBest[0]
          const worst = byWorst[0]
          const toReviews = (fbs: RefFeedback[]) =>
            fbs.map((fb) => ({
              id: fb.id,
              userName: fb.userName,
              userHandle: fb.userHandle ?? null,
              userImage: fb.userImage ?? null,
              teamName: fb.teamName,
              teamSlug: fb.teamSlug,
              teamEmblem: fb.teamEmblem,
              likeCount: fb.likeCount,
              comment: fb.comment,
              matchLabel: fb.matchLabel,
              rating: fb.rating,
            }))
          if (best) {
            const bestPeers = byRole.filter(
              (s) =>
                s.id !== best.id &&
                s.matchId === best.matchId &&
                Math.abs(s.avg - best.avg) < 1e-6,
            )
            bestByRole[role] = {
              refereeId: best.id,
              slug: best.slug,
              name: best.name,
              role: best.role,
              avg: best.avg,
              voteCount: best.voteCount,
              peerRefs:
                bestPeers.length > 0
                  ? bestPeers.map((p) => ({ name: p.name, slug: p.slug }))
                  : undefined,
              matchForDisplay: best.matchForDisplay,
              reviews: toReviews(best.feedbacks),
            }
          }
          if (worst) {
            const worstPeers = byRole.filter(
              (s) =>
                s.id !== worst.id &&
                s.matchId === worst.matchId &&
                Math.abs(s.avg - worst.avg) < 1e-6,
            )
            worstByRole[role] = {
              refereeId: worst.id,
              slug: worst.slug,
              name: worst.name,
              role: worst.role,
              avg: worst.avg,
              voteCount: worst.voteCount,
              peerRefs:
                worstPeers.length > 0
                  ? worstPeers.map((p) => ({ name: p.name, slug: p.slug }))
                  : undefined,
              matchForDisplay: worst.matchForDisplay,
              reviews: toReviews(worst.feedbacks),
            }
          }
        }
      }
    }

    const youtubeEmbedUrl = getYouTubeEmbedUrl((round as { youtubeUrl?: string | null }).youtubeUrl ?? null)
    const instagramEmbedUrl = getInstagramEmbedUrl(
      (round as { instagramUrl?: string | null }).instagramUrl ?? null
    )

    const hasRefereeData =
      Object.keys(bestByRole).length > 0 ||
      Object.keys(worstByRole).length > 0 ||
      allRoundReferees.length > 0
    if (!hasRefereeData && !youtubeEmbedUrl && !instagramEmbedUrl) {
      return null
    }

    return {
      leagueName: round.league.name,
      roundNumber: round.number,
      bestByRole,
      worstByRole,
      allRoundReferees,
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
    firstCommentPreview?: string
    matchDetailPath?: string
  }> = []
  if (focusMatchIds.length > 0) {
    try {
      // 포커스 라운드 경기별로 쟁점 순간이 있는 모든 경기가 메인에 나오도록 제한 없이 조회
      const rows = await prisma.moment.findMany({
        where: { matchId: { in: focusMatchIds } },
        orderBy: { seeVarCount: "desc" },
        include: {
          match: {
            include: {
              homeTeam: true,
              awayTeam: true,
              round: { include: { league: { include: { season: true } } } },
            },
          },
          comments: {
            where: { parentId: null, status: "VISIBLE" },
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { content: true },
          },
        },
      })
      hotMoments = rows.map((mom, i) => {
        const firstContent = (mom as { comments?: { content: string }[] }).comments?.[0]?.content
        const firstCommentPreview = firstContent
          ? firstContent.replace(/\s+/g, " ").trim().slice(0, 40) + (firstContent.length > 40 ? "…" : "")
          : null
        const matchForPath = {
          roundOrder: mom.match.roundOrder,
          round: mom.match.round as { slug: string; league: { slug: string; season: { year: number } } },
        }
        return {
          rank: i + 1,
          momentId: mom.id,
          matchId: mom.matchId,
          league: mom.match.round.league.name.toUpperCase(),
          homeName: shortNameFromSlug(mom.match.homeTeam.slug),
          awayName: shortNameFromSlug(mom.match.awayTeam.slug),
          homeEmblem: mom.match.homeTeam.emblemPath ?? "",
          awayEmblem: mom.match.awayTeam.emblemPath ?? "",
          time: mom.startPeriod != null && mom.startMinuteInPeriod != null
            ? formatMomentTimeFromPeriod(mom.startPeriod, mom.startMinuteInPeriod)
            : mom.startMinute != null
              ? formatMatchMinuteForDisplay(mom.startMinute)
              : (mom.title ?? "—"),
          varCount: mom.seeVarCount,
          commentCount: mom.commentCount,
          firstCommentPreview: firstCommentPreview ?? undefined,
          matchDetailPath: getMatchDetailPath(matchForPath),
        }
      })
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
                라운드 베스트/워스트 심판
              </h2>
              <div className="space-y-8">
                {[k1Highlight, k2Highlight].map(
                  (h) =>
                    h && (
                      <div key={`${h.leagueName}-${h.roundNumber}`} className="space-y-2">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest px-1">
                          {h.leagueName} · Round {h.roundNumber}
                        </p>
                        <RoundRefereeBestWorstSection
                          bestByRole={h.bestByRole}
                          worstByRole={h.worstByRole}
                          allRoundReferees={h.allRoundReferees}
                          leagueName={h.leagueName}
                          roundNumber={h.roundNumber}
                        />
                      </div>
                    )
                )}
              </div>
            </section>
          )}

          <HotMomentsSection hotMoments={hotMoments} />
          <LeagueMatchesSection
            k1Matches={k1Matches}
            k2Matches={k2Matches}
            k1RoundNumber={k1Round1?.number ?? 1}
            k2RoundNumber={k2Round1?.number ?? 1}
            hasK1Focus={k1Round1 !== null}
            hasK2Focus={k2Round1 !== null}
          />

          {/* 라운드 판정 리포트 - 메인 페이지 가장 하단 */}
          {(k1Highlight?.youtubeEmbedUrl ||
            k1Highlight?.instagramEmbedUrl ||
            k2Highlight?.youtubeEmbedUrl ||
            k2Highlight?.instagramEmbedUrl) && (
            <section className="mb-8 md:mb-12">
              <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
                라운드 판정 리포트
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
