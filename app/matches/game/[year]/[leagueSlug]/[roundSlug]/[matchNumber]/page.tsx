import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deriveMatchStatus } from "@/lib/utils/match-status"
import { sortMomentsByStartThenDuration } from "@/lib/utils/sort-moments"
import { MatchDetailBackLink } from "@/components/matches/MatchDetailBackLink"
import { MatchMomentCards } from "@/components/matches/MatchMomentCards"
import { MatchRefereeRatingSectionDynamic } from "@/components/matches/MatchRefereeRatingSectionDynamic"
import { SeeVarButtonWithModal } from "@/components/matches/SeeVarButtonWithModal"
import { getMatchDetailPath } from "@/lib/match-url"

type Params = Promise<{ year: string; leagueSlug: string; roundSlug: string; matchNumber: string }>

/** DB RefereeRole → 표시 라벨 (경기 상세 심판 그리드용) */
const ROLE_LABEL: Record<string, string> = {
  MAIN: "Referee",
  ASSISTANT: "Assistance",
  WAITING: "Waiting",
  VAR: "VAR",
}
/** 표시 순서: 주심 → 부심 → 대기심 → VAR */
const ROLE_DISPLAY_ORDER: (keyof typeof ROLE_LABEL)[] = ["MAIN", "ASSISTANT", "WAITING", "VAR"]

export async function generateMetadata({ params }: { params: Params }) {
  const { year, leagueSlug, roundSlug, matchNumber } = await params
  const match = await resolveMatchBySlug(year, leagueSlug, roundSlug, matchNumber)
  if (!match) return { title: "경기 없음 | See VAR" }
  return {
    title: `${match.homeTeam.name} vs ${match.awayTeam.name} | See VAR`,
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
      moments: { orderBy: { startMinute: "asc" } },
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

type SearchParams = Promise<{ back?: string }>

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
  const { back: backParam } = await searchParams
  const [match, currentUser] = await Promise.all([
    resolveMatchBySlug(year, leagueSlug, roundSlug, matchNumber),
    getCurrentUser(),
  ])
  if (!match) notFound()

  const matchPath = getMatchDetailPath(match)
  const backHref = sanitizeBackUrl(backParam ?? undefined) ?? "/matches"

  const status = deriveMatchStatus(match.playedAt, { storedStatus: match.status })
  const isUpcoming = status === "SCHEDULED"
  const isLive = status === "LIVE"
  const isFinished = status === "FINISHED"
  const dateStr = match.playedAt
    ? new Date(match.playedAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\. /g, "/").replace(".", "")
    : ""
  const timeStr = match.playedAt
    ? new Date(match.playedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : ""

  const refereesByRole = ROLE_DISPLAY_ORDER.reduce(
    (acc, role) => {
      acc[role] = match.matchReferees
        .filter((mr) => mr.role === role)
        .map((mr) => mr.referee)
      return acc
    },
    {} as Record<string, { id: string; name: string; slug: string; link?: string | null }[]>
  )
  const sortedMoments = sortMomentsByStartThenDuration(match.moments ?? [])

  const matchReviews =
    status === "FINISHED" &&
    (await prisma.refereeReview.findMany({
      where: { matchId: match.id, status: "VISIBLE" },
      include: {
        user: { select: { name: true } },
        fanTeam: { select: { name: true, emblemPath: true } },
      },
    }))
  const reviewsForRating = Array.isArray(matchReviews) ? matchReviews : []

  return (
    <main className="py-8 md:py-12">
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
              <span className="opacity-70 underline">
                {dateStr} REGULAR SEASON
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="ledger-surface mb-6 md:mb-8 p-4 md:p-8 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-8 md:gap-12">
          <div className="flex flex-col items-center gap-4 md:gap-6">
            <Link
              href={teamDetailHref(match.homeTeam, matchPath)}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-border flex flex-col items-center justify-center bg-card hover:border-primary transition-colors"
            >
              {match.homeTeam.emblemPath && (
                <img
                  src={match.homeTeam.emblemPath}
                  alt=""
                  className="w-14 h-14 md:w-20 md:h-20"
                />
              )}
              <span className="mt-2 text-[8px] md:text-[10px] font-black italic text-center text-foreground leading-tight px-1">
                {match.homeTeam.name}
              </span>
            </Link>
          </div>

          <div className="text-center flex flex-col items-center">
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
              </>
            )}
            {isFinished && match.scoreHome != null && match.scoreAway != null && (
              <>
                <div className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 flex items-center gap-4 md:gap-6">
                  <span>{match.scoreHome}</span>
                  <span className="text-muted-foreground text-3xl md:text-4xl">:</span>
                  <span>{match.scoreAway}</span>
                </div>
                <p className="font-mono text-sm text-muted-foreground">FT</p>
              </>
            )}

            <div className="w-full h-px bg-border my-6" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 md:gap-y-4 gap-x-4 md:gap-x-8 font-mono text-[10px] md:text-xs text-left mb-6 md:mb-8 w-full max-w-xs">
              {ROLE_DISPLAY_ORDER.map((role) => {
                const refs = refereesByRole[role] ?? []
                const label = ROLE_LABEL[role] ?? role
                const isVar = role === "VAR"
                const isMain = role === "MAIN"
                return (
                  <div key={role}>
                    <p className="text-muted-foreground mb-1 uppercase tracking-tighter text-[8px] md:text-[10px]">
                      {label}
                    </p>
                    {refs.length === 0 ? (
                      <p className="text-muted-foreground">—</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        {refs.map((ref, idx) => {
                          const sep = idx > 0 ? <span className="text-muted-foreground">·</span> : null
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
                                  className={`font-bold hover:text-primary transition-colors inline-flex items-center gap-0.5 ${isVar ? "text-primary" : ""}`}
                                >
                                  {ref.name}
                                  <ChevronRight className="size-3" />
                                </Link>
                              </span>
                            )
                          }
                          return (
                            <span key={ref.id} className={`inline-flex items-center gap-0.5 ${isVar ? "text-primary" : ""}`}>
                              {sep}
                              <span className="font-bold">{ref.name}</span>
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
              <SeeVarButtonWithModal matchId={match.id} variant="live" />
            )}
            {isUpcoming && (
              <div className="bg-card border border-border px-6 md:px-8 py-3 md:py-4 font-mono text-[10px] md:text-xs text-muted-foreground italic">
                경기 시작 전입니다.
              </div>
            )}
            {isFinished && (
              <SeeVarButtonWithModal matchId={match.id} variant="finished" />
            )}
          </div>

          <div className="flex flex-col items-center gap-4 md:gap-6">
            <Link
              href={teamDetailHref(match.awayTeam, matchPath)}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-border flex flex-col items-center justify-center bg-card hover:border-primary transition-colors"
            >
              {match.awayTeam.emblemPath && (
                <img
                  src={match.awayTeam.emblemPath}
                  alt=""
                  className="w-14 h-14 md:w-20 md:h-20"
                />
              )}
              <span className="mt-2 text-[8px] md:text-[10px] font-black italic text-center text-foreground leading-tight px-1">
                {match.awayTeam.name}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {(isLive || isFinished) && sortedMoments.length > 0 && (
        <section className="mb-8 md:mb-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">
              MATCH MOMENTS
            </h2>
          </div>
          <MatchMomentCards
            moments={sortedMoments}
            match={{
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              round: match.round,
            }}
            matchId={match.id}
            variant="hot"
          />
        </section>
      )}

      {isFinished ? (
        <MatchRefereeRatingSectionDynamic
          matchId={match.id}
          homeTeamId={match.homeTeam.id}
          awayTeamId={match.awayTeam.id}
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
            user: { name: r.user.name },
            fanTeamId: r.fanTeamId,
            fanTeam: r.fanTeam
              ? { name: r.fanTeam.name, emblemPath: r.fanTeam.emblemPath }
              : null,
          }))}
          currentUserId={currentUser?.id ?? null}
        />
      ) : (
        <div className="mb-8 border border-border bg-card/50">
          <div className="flex items-stretch border-b border-border">
            <button
              type="button"
              className="px-4 md:px-6 py-3 font-mono text-xs font-black tracking-widest text-muted-foreground opacity-50 cursor-default"
              disabled
            >
              REFEREE RATING (LOCKED)
            </button>
          </div>
          <div className="p-8 text-center font-mono text-xs text-muted-foreground">
            심판 평가는 경기 종료 후 활성화됩니다.
          </div>
        </div>
      )}
    </main>
  )
}
