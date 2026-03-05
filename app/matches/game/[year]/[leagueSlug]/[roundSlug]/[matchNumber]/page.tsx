import { notFound } from "next/navigation"
import { unstable_cache } from "next/cache"
import Link from "next/link"
import { Suspense } from "react"
import { ChevronRight } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deriveMatchStatus } from "@/lib/utils/match-status"
import { sortMomentsByStartThenDuration } from "@/lib/utils/sort-moments"
import { MatchDetailBackLink } from "@/components/matches/MatchDetailBackLink"
import { MatchMomentCards } from "@/components/matches/MatchMomentCards"
import { MatchRefereeRatingSectionDynamic } from "@/components/matches/MatchRefereeRatingSectionDynamic"
import { ScrollToRefereeSection } from "@/components/matches/ScrollToRefereeSection"
import { SeeVarButtonWithModal } from "@/components/matches/SeeVarButtonWithModal"
import { getMatchDetailPath } from "@/lib/match-url"
import { getYouTubeEmbedUrl, getInstagramEmbedUrl } from "@/lib/embed-urls"

type Params = Promise<{ year: string; leagueSlug: string; roundSlug: string; matchNumber: string }>

/** 경기 상세 match에 미디어 URL 포함 (캐시 반환 타입 보완) */
type MatchWithMedia = { youtubeUrl?: string | null; instagramUrl?: string | null }

/** 리뷰 목록 조회 결과 (unstable_cache 반환 타입 명시) */
type MatchReviewWithRelations = {
  id: string
  userId: string
  refereeId: string
  rating: number
  comment: string | null
  status: string
  filterReason: string | null
  fanTeamId: string | null
  user: { name: string | null; image: string | null }
  fanTeam: { name: string; emblemPath: string | null } | null
  reactions: { userId: string }[]
  replies: Array<{
    id: string
    userId: string
    content: string
    createdAt: Date
    user: {
      name: string | null
      image: string | null
      supportingTeam: { name: string; emblemPath: string | null } | null
    }
    reactions: { userId: string }[]
  }>
}

/** DB RefereeRole → 표시 라벨 (경기 상세 심판 그리드용) */
const ROLE_LABEL: Record<string, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  WAITING: "대기심",
  VAR: "VAR",
}
/** 표시 순서: 주심 → 부심 → 대기심 → VAR */
const ROLE_DISPLAY_ORDER: (keyof typeof ROLE_LABEL)[] = ["MAIN", "ASSISTANT", "WAITING", "VAR"]

export async function generateMetadata({ params }: { params: Params }) {
  const { year, leagueSlug, roundSlug, matchNumber } = await params
  const match = await resolveMatchBySlug(year, leagueSlug, roundSlug, matchNumber)
  if (!match) return { title: "경기 없음 | SEE VAR" }
  return {
    title: `${match.homeTeam.name} vs ${match.awayTeam.name} | SEE VAR`,
  }
}

async function resolveMatchBySlug(
  yearStr: string,
  leagueSlug: string,
  roundSlug: string,
  matchNumberStr: string
) {
  const year = parseInt(yearStr, 10)
  const matchNumber = parseInt(matchNumberStr, 10)
  if (Number.isNaN(year) || Number.isNaN(matchNumber) || matchNumber < 1) return null
  const season = await prisma.season.findUnique({ where: { year } })
  if (!season) return null
  const league = await prisma.league.findFirst({
    where: { seasonId: season.id, slug: leagueSlug },
  })
  if (!league) return null
  const round = await prisma.round.findFirst({
    where: { leagueId: league.id, slug: roundSlug },
  })
  if (!round) return null
  const match = await prisma.match.findUnique({
    where: { roundId_roundOrder: { roundId: round.id, roundOrder: matchNumber } },
    include: {
      homeTeam: true,
      awayTeam: true,
      round: { include: { league: { include: { season: true } } } },
      matchReferees: { include: { referee: true }, orderBy: { role: "asc" } },
      moments: {
        orderBy: { startMinute: "asc" },
        include: {
          comments: {
            where: { parentId: null, status: "VISIBLE" },
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { content: true },
          },
        },
      },
    },
  }).catch((e: { code?: string }) => {
    if (e?.code === "P2021") return null
    throw e
  })
  if (!match) return null
  const fallback = await prisma.match.findUnique({
    where: { roundId_roundOrder: { roundId: round.id, roundOrder: matchNumber } },
    include: {
      homeTeam: true,
      awayTeam: true,
      round: { include: { league: { include: { season: true } } } },
      matchReferees: { include: { referee: true }, orderBy: { role: "asc" } },
    },
  })
  if (!fallback) return null
  return { ...(match ?? fallback), moments: match?.moments ?? [] }
}

/** 경기 상세 캐시 (60초). 같은 경기 재방문 시 DB 부하 감소 */
function getCachedMatch(
  year: string,
  leagueSlug: string,
  roundSlug: string,
  matchNumber: string
) {
  return unstable_cache(
    () => resolveMatchBySlug(year, leagueSlug, roundSlug, matchNumber),
    ["match-detail", year, leagueSlug, roundSlug, matchNumber],
    { revalidate: 60, tags: ["match-details"] },
  )()
}

type SearchParams = Promise<{ back?: string; openMoment?: string; referee?: string }>

function sanitizeBackUrl(back: string | undefined): string {
  if (!back || typeof back !== "string") return "/matches"
  const decoded = decodeURIComponent(back)
  if (!decoded.startsWith("/") || decoded.includes("//")) return "/matches"
  return decoded
}

/** 팀 상세 URL: slug가 있으면 _ → - 로, 없으면 id. back 있으면 쿼리로 붙여 진입 전 경로로 복귀 가능 */
function teamDetailHref(team: { id: string; slug?: string | null }, backPath: string): string {
  const segment = team.slug ? team.slug.replace(/_/g, "-") : team.id
  const base = `/teams/${segment}`
  if (!backPath.startsWith("/") || backPath.includes("//")) return base
  return `${base}?back=${encodeURIComponent(backPath)}`
}

export default async function MatchDetailBySlugPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { year, leagueSlug, roundSlug, matchNumber } = await params
  const { back: backParam, openMoment: openMomentId, referee: refereeSlug } = await searchParams
  const [match, currentUser] = await Promise.all([
    getCachedMatch(year, leagueSlug, roundSlug, matchNumber),
    getCurrentUser(),
  ])
  if (!match) notFound()

  const matchPath = getMatchDetailPath(match)
  const backHref = sanitizeBackUrl(backParam ?? undefined) ?? "/matches"

  const status = deriveMatchStatus(match.playedAt, { storedStatus: match.status })
  const isUpcoming = status === "SCHEDULED"
  const isLive = status === "LIVE"
  const isFinished = status === "FINISHED"
  const tz = "Asia/Seoul"
  const dateStr = match.playedAt
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(new Date(match.playedAt))
        .replace(/-/g, "/")
    : ""
  const timeStr = match.playedAt
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(match.playedAt))
    : ""

  const refereesByRole = ROLE_DISPLAY_ORDER.reduce(
    (acc, role) => {
      const refs = match.matchReferees
        .filter((mr) => mr.role === role)
        .map((mr) => mr.referee)
        .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      acc[role] = refs
      return acc
    },
    {} as Record<string, { id: string; name: string; slug: string; link?: string | null }[]>
  )

  const cardTotals = match.matchReferees.reduce(
    (acc, mr) => {
      acc.homeYellow += mr.homeYellowCards ?? 0
      acc.homeRed += mr.homeRedCards ?? 0
      acc.awayYellow += mr.awayYellowCards ?? 0
      acc.awayRed += mr.awayRedCards ?? 0
      return acc
    },
    { homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }
  )
  const hasAnyCards =
    cardTotals.homeYellow > 0 ||
    cardTotals.homeRed > 0 ||
    cardTotals.awayYellow > 0 ||
    cardTotals.awayRed > 0

  const sortedMoments = sortMomentsByStartThenDuration(match.moments ?? [])
  const momentsWithFirstComment = sortedMoments.map((m) => {
    const comments = (m as { comments?: { content: string }[] }).comments
    const firstContent = comments?.[0]?.content
    const firstCommentPreview = firstContent
      ? firstContent.replace(/\s+/g, " ").trim().slice(0, 40) + (firstContent.length > 40 ? "…" : "")
      : null
    return {
      id: m.id,
      title: m.title,
      description: m.description ?? null,
      startMinute: m.startMinute,
      startPeriod: m.startPeriod ?? null,
      startMinuteInPeriod: m.startMinuteInPeriod ?? null,
      endMinute: m.endMinute,
      seeVarCount: m.seeVarCount,
      commentCount: m.commentCount,
      firstCommentPreview,
    }
  })

  const matchReviewsRaw =
    status === "FINISHED" &&
    (await unstable_cache(
      async () =>
        prisma.refereeReview.findMany({
          where: { matchId: match.id, status: { in: ["VISIBLE", "HIDDEN"] } },
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true, image: true } },
            fanTeam: { select: { name: true, emblemPath: true } },
            reactions: { select: { userId: true } },
            replies: {
              orderBy: { createdAt: "asc" },
              include: {
                user: {
                  include: {
                    supportingTeam: { select: { name: true, emblemPath: true } },
                  },
                },
              },
            },
          },
        }),
      ["match-reviews", match.id],
      { revalidate: 30, tags: [`match-reviews-${match.id}`] }
    )())
  const matchReviews = Array.isArray(matchReviewsRaw)
    ? (matchReviewsRaw as unknown as MatchReviewWithRelations[])
    : []
  const reviewsForRating = matchReviews

  return (
    <main className="py-8 md:py-12">
      <Suspense fallback={null}>
        <ScrollToRefereeSection />
      </Suspense>
      <div className="mb-6">
        <MatchDetailBackLink backHref={String(backHref)} />
      </div>

      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-1">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </h1>
          <div className="flex items-center gap-2 font-mono text-[10px] md:text-xs text-muted-foreground">
            {isLive && (
              <span className="bg-red-600 text-white px-2 py-0.5 font-bold uppercase animate-pulse">
                ● LIVE
              </span>
            )}
            {isUpcoming && (
              <span className="bg-muted text-foreground px-2 py-0.5 font-bold uppercase">
                MATCH UPCOMING
              </span>
            )}
            {isFinished && (
              <span className="bg-muted text-foreground px-2 py-0.5 font-bold uppercase">
                FINISHED
              </span>
            )}
            {dateStr && (
              <span className="opacity-90">
                {dateStr}
                {timeStr ? ` ${timeStr} KST` : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="ledger-surface mb-6 md:mb-8 p-4 md:p-8 relative overflow-hidden">
        <div className="grid grid-cols-3 items-start gap-3 sm:gap-6 md:gap-12">
          <div className="flex flex-col items-center gap-2 md:gap-6 self-start">
            <Link
              href={teamDetailHref(match.homeTeam, matchPath)}
              className="w-14 h-14 sm:w-20 sm:h-20 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-border flex flex-col items-center justify-center bg-card hover:border-primary transition-colors shrink-0"
            >
              {match.homeTeam.emblemPath && (
                <img
                  src={match.homeTeam.emblemPath}
                  alt=""
                  className="w-8 h-8 sm:w-12 sm:h-12 md:w-20 md:h-20"
                />
              )}
              <span className="mt-0.5 md:mt-2 text-[7px] sm:text-[8px] md:text-[10px] font-black italic text-center text-foreground leading-tight px-0.5 line-clamp-2">
                {match.homeTeam.name}
              </span>
            </Link>
          </div>

          <div className="text-center flex flex-col items-center min-w-0">
            {isLive && (
              <>
                <div className="font-mono text-primary text-xs md:text-sm mb-2 uppercase font-bold tracking-widest animate-pulse">
                  ● LIVE NOW
                </div>
                <div className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 flex items-center gap-4 md:gap-6">
                  <span>{match.scoreHome ?? 0}</span>
                  <span className="text-muted-foreground text-3xl md:text-4xl">:</span>
                  <span>{match.scoreAway ?? 0}</span>
                </div>
                {hasAnyCards && (
                  <div className="font-mono text-[10px] md:text-xs text-muted-foreground flex items-center justify-center gap-4 md:gap-6">
                    <span>🟨 {cardTotals.homeYellow} 🟥 {cardTotals.homeRed}</span>
                    <span className="opacity-50">·</span>
                    <span>🟨 {cardTotals.awayYellow} 🟥 {cardTotals.awayRed}</span>
                  </div>
                )}
              </>
            )}
            {isUpcoming && (
              <>
                <div className="font-mono text-muted-foreground text-xs md:text-sm mb-2 uppercase font-bold tracking-widest">
                  KICK OFF {timeStr || "—"}
                </div>
                <div className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4">
                  VS
                </div>
                {match.venue?.trim() && (
                  <p className="font-mono text-sm text-muted-foreground">{match.venue.trim()}</p>
                )}
              </>
            )}
            {isFinished && (match.scoreHome != null && match.scoreAway != null ? (
              <>
                <div className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 flex items-center gap-4 md:gap-6">
                  <span>{match.scoreHome}</span>
                  <span className="text-muted-foreground text-3xl md:text-4xl">:</span>
                  <span>{match.scoreAway}</span>
                </div>
                {match.venue?.trim() && (
                  <p className="font-mono text-sm text-muted-foreground">{match.venue.trim()}</p>
                )}
                {hasAnyCards && (
                  <div className="font-mono text-[10px] md:text-xs text-muted-foreground mt-3 flex items-center justify-center gap-4 md:gap-6">
                    <span>🟨 {cardTotals.homeYellow} 🟥 {cardTotals.homeRed}</span>
                    <span className="opacity-50">·</span>
                    <span>🟨 {cardTotals.awayYellow} 🟥 {cardTotals.awayRed}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 flex items-center gap-4 md:gap-6">
                  <span className="text-muted-foreground">—</span>
                  <span className="text-muted-foreground text-3xl md:text-4xl">:</span>
                  <span className="text-muted-foreground">—</span>
                </div>
                {match.venue?.trim() && (
                  <p className="font-mono text-sm text-muted-foreground">{match.venue.trim()}</p>
                )}
              </>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 md:gap-6 self-start">
            <Link
              href={teamDetailHref(match.awayTeam, matchPath)}
              className="w-14 h-14 sm:w-20 sm:h-20 md:w-32 md:h-32 rounded-full border-2 md:border-4 border-border flex flex-col items-center justify-center bg-card hover:border-primary transition-colors shrink-0"
            >
              {match.awayTeam.emblemPath && (
                <img
                  src={match.awayTeam.emblemPath}
                  alt=""
                  className="w-8 h-8 sm:w-12 sm:h-12 md:w-20 md:h-20"
                />
              )}
              <span className="mt-0.5 md:mt-2 text-[7px] sm:text-[8px] md:text-[10px] font-black italic text-center text-foreground leading-tight px-0.5 line-clamp-2">
                {match.awayTeam.name}
              </span>
            </Link>
          </div>

          <div className="col-span-3 w-full min-w-0">
            <div className="w-full h-px bg-border my-6" />

            <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-3 md:gap-x-8 md:gap-y-4 font-mono text-left mb-6 md:mb-8 w-full">
              {ROLE_DISPLAY_ORDER.map((role) => {
                const refs = refereesByRole[role] ?? []
                const label = ROLE_LABEL[role] ?? role
                return (
                  <div key={role} className="min-w-0">
                    <p className="text-muted-foreground mb-0.5 sm:mb-1 uppercase tracking-tighter text-[10px] sm:text-xs font-semibold">
                      {label}
                    </p>
                    {refs.length === 0 ? (
                      <p className="text-muted-foreground text-xs sm:text-sm">—</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        {refs.map((ref, idx) => {
                          const sep = idx > 0 ? <span className="text-muted-foreground text-xs">·</span> : null
                          const slug = (ref as { slug?: string }).slug
                          const refereeHref = slug
                            ? `/referees/${slug}${matchPath ? `?back=${encodeURIComponent(matchPath)}` : ""}`
                            : null
                          if (refereeHref) {
                            return (
                              <span key={ref.id} className="inline-flex items-center gap-0.5">
                                {sep}
                                <Link
                                  href={refereeHref}
                                  className="font-bold text-xs sm:text-sm hover:text-primary transition-colors inline-flex items-center gap-0.5 whitespace-nowrap"
                                >
                                  {ref.name}
                                  <ChevronRight className="size-3 sm:size-4 shrink-0" />
                                </Link>
                              </span>
                            )
                          }
                          return (
                            <span key={ref.id} className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-bold whitespace-nowrap">
                              {sep}
                              <span>{ref.name}</span>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {isLive && (
              <div className="flex justify-center">
                <SeeVarButtonWithModal
                  matchId={match.id}
                  variant="live"
                  isLoggedIn={!!currentUser}
                />
              </div>
            )}
            {isUpcoming && (
              <div className="bg-card border border-border px-6 md:px-8 py-3 md:py-4 font-mono text-[10px] md:text-xs text-muted-foreground italic">
                경기 시작 전입니다.
              </div>
            )}
            {isFinished && (
              <div className="flex justify-center">
                <SeeVarButtonWithModal
                  matchId={match.id}
                  variant="finished"
                  isLoggedIn={!!currentUser}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {(isLive || isFinished) && momentsWithFirstComment.length > 0 && (
        <section className="mb-8 md:mb-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">
              경기 쟁점 순간
            </h2>
          </div>
          <MatchMomentCards
            moments={momentsWithFirstComment}
            match={{
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              round: match.round,
            }}
            matchId={match.id}
            variant="hot"
            initialOpenMomentId={openMomentId ?? undefined}
          />
        </section>
      )}

      <section id="referee-rating" className="scroll-mt-6">
      {isFinished ? (
        <MatchRefereeRatingSectionDynamic
          matchId={match.id}
          homeTeamId={match.homeTeam.id}
          awayTeamId={match.awayTeam.id}
          initialRefereeSlug={refereeSlug ?? null}
          matchReferees={match.matchReferees.map((mr) => ({
            id: mr.id,
            role: mr.role,
            referee: { id: mr.referee.id, name: mr.referee.name, slug: mr.referee.slug },
          }))}
          reviews={reviewsForRating.map((r) => ({
            id: r.id,
            refereeId: r.refereeId,
            userId: r.userId,
            rating: r.rating,
            comment: r.comment,
            status: r.status,
            filterReason: r.filterReason,
            user: {
              name: r.user.name,
              image: r.user.image ?? null,
            },
            fanTeamId: r.fanTeamId,
            fanTeam: r.fanTeam
              ? { name: r.fanTeam.name, emblemPath: r.fanTeam.emblemPath }
              : null,
            reactions: r.reactions ?? [],
            replies:
              r.replies?.map((rp: MatchReviewWithRelations["replies"][number]) => ({
                id: rp.id,
                userId: rp.userId,
                content: rp.content,
                createdAt: rp.createdAt,
                user: {
                  name: rp.user.name,
                  image: rp.user.image ?? null,
                  supportingTeam: rp.user.supportingTeam
                    ? {
                        name: rp.user.supportingTeam.name,
                        emblemPath: rp.user.supportingTeam.emblemPath,
                      }
                    : null,
                },
                reactions: "reactions" in rp && Array.isArray(rp.reactions) ? rp.reactions : [],
              })) ?? [],
          }))}
          currentUserId={currentUser?.id ?? null}
          currentUserName={currentUser?.name ?? null}
          currentUserImage={currentUser?.image ?? null}
          currentUserSupportingTeam={
            currentUser?.supportingTeam
              ? {
                  name: currentUser.supportingTeam.name,
                  emblemPath: currentUser.supportingTeam.emblemPath,
                }
              : null
          }
        />
      ) : (
        <div className="mb-8 border border-border bg-card/50">
          <div className="flex items-stretch border-b border-border">
            <button
              type="button"
              className="px-4 md:px-6 py-3 font-mono text-xs font-black tracking-widest text-muted-foreground opacity-50 cursor-default"
              disabled
            >
              심판 평가 (잠김)
            </button>
          </div>
          <div className="p-8 text-center font-mono text-xs text-muted-foreground">
            심판 평가는 경기 종료 후 활성화됩니다.
          </div>
        </div>
      )}
      </section>

      {/* 경기 판정 리포트 - 경기별 유튜브·인스타 카드 (Round Media와 동일 패턴) */}
      {((match as MatchWithMedia).youtubeUrl || (match as MatchWithMedia).instagramUrl) && (
        <section className="mt-8 md:mt-12">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-4">
            경기 판정 리포트
          </h2>
          <div className="flex flex-col gap-4 md:gap-6">
            {getYouTubeEmbedUrl((match as MatchWithMedia).youtubeUrl) && (
              <div className="border border-border bg-card/60 p-3 md:p-4">
                <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Match Review · YouTube
                </p>
                <div className="relative w-full pt-[56.25%] bg-black border border-border overflow-hidden">
                  <iframe
                    src={getYouTubeEmbedUrl((match as MatchWithMedia).youtubeUrl)!}
                    title="Match review video"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            {getInstagramEmbedUrl((match as MatchWithMedia).instagramUrl) && (
              <div className="border border-border bg-card/60 p-3 md:p-4">
                <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Card News · Instagram
                </p>
                <div className="relative w-full pt-[125%] bg-black border border-border overflow-hidden">
                  <iframe
                    src={getInstagramEmbedUrl((match as MatchWithMedia).instagramUrl)!}
                    title="Match card news"
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
