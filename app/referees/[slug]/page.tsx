import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPathWithBack } from "@/lib/match-url"
import { RefereeRatingSection } from "@/components/referees/RefereeRatingSection"
import { RefereeMatchRow } from "@/components/referees/RefereeMatchRow"
import { RefereeAssignmentYearFilter } from "@/components/referees/RefereeAssignmentYearFilter"

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ year?: string; back?: string }>
}

async function resolveReferee(param: string) {
  const bySlug = await prisma.referee.findUnique({
    where: { slug: param },
    include: {
      stats: { include: { season: { select: { year: true } } } },
      teamStats: {
        include: {
          team: true,
        },
      },
      matchReferees: {
        take: 30,
        include: {
          match: {
            include: {
              homeTeam: true,
              awayTeam: true,
              round: {
                include: {
                  league: {
                    include: {
                      season: { select: { year: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      reviews: {
        where: { status: "VISIBLE" },
        include: {
          match: { select: { id: true } },
          fanTeam: true,
          user: { select: { name: true, image: true } },
        },
      },
    },
  })
  if (bySlug) return { referee: bySlug, byId: false }

  const byId = await prisma.referee.findUnique({
    where: { id: param },
    include: {
      stats: { include: { season: { select: { year: true } } } },
      teamStats: { include: { team: true } },
      matchReferees: {
        take: 30,
        include: {
          match: {
            include: {
              homeTeam: true,
              awayTeam: true,
              round: {
                include: {
                  league: {
                    include: {
                      season: { select: { year: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      reviews: {
        where: { status: "VISIBLE" },
        include: {
          match: { select: { id: true } },
          fanTeam: true,
          user: { select: { name: true, image: true } },
        },
      },
    },
  })
  if (byId) return { referee: byId, byId: true }
  return null
}

export async function generateMetadata({ params }: Props) {
  const { slug: param } = await params
  const resolved = await resolveReferee(param)
  if (!resolved) return { title: "심판 없음 | See VAR" }
  return { title: `${resolved.referee.name} | REFEREE | See VAR` }
}

function sanitizeBackUrl(back: string | undefined): string | null {
  if (!back || typeof back !== "string") return null
  const decoded = decodeURIComponent(back)
  if (!decoded.startsWith("/") || decoded.includes("//")) return null
  return decoded
}

export default async function RefereeDetailPage({ params, searchParams }: Props) {
  const { slug: param } = await params
  const { year: yearParam, stats: statsParam, back: backParam } = await searchParams
  const backHref = sanitizeBackUrl(backParam ?? undefined) ?? "/referees"
  const resolved = await resolveReferee(param)
  if (!resolved) notFound()
  const { referee: rawReferee, byId } = resolved
  const referee = rawReferee as typeof rawReferee & {
    id: string
    slug: string
    stats: Array<{ season: { year: number }; role: string; matchCount: number; avgRating: number }>
    teamStats: Array<{ team: { id: string; name: string; emblemPath: string | null }; fanAverageRating: number; totalAssignments: number }>
    matchReferees: Array<{ id: string; match: { id: string; playedAt: Date | null; roundOrder: number; homeTeam: { name: string; emblemPath: string | null }; awayTeam: { name: string; emblemPath: string | null }; round: { slug: string; league: { slug: string; season: { year: number } } } }; role: string }>
    reviews: Array<{ matchId: string; user: { name: string | null; image: string | null }; fanTeam: { id: string; name: string; emblemPath: string | null } | null; rating: number; comment: string | null }>
  }

  if (byId) {
    const backQuery = backParam ? `?back=${encodeURIComponent(backParam)}` : ""
    redirect(`/referees/${referee.slug}${backQuery}`)
  }

  const yearsFromStats = referee.stats.map((s) => s.season.year)
  const yearsFromMatches = referee.matchReferees.map(
    (mr) => mr.match.round.league.season.year
  )
  const availableYears = [...new Set([...yearsFromStats, ...yearsFromMatches])].sort(
    (a, b) => b - a
  )
  const latestYear = availableYears[0] ?? null
  const yearFromParam =
    yearParam != null && yearParam !== ""
      ? parseInt(yearParam, 10)
      : null
  const assignmentYear =
    yearFromParam != null && Number.isInteger(yearFromParam) && availableYears.includes(yearFromParam)
      ? yearFromParam
      : latestYear
  const isYearValid = assignmentYear != null

  const statsYear =
    statsParam === "all" || statsParam == null || statsParam === ""
      ? null
      : (() => {
          const n = parseInt(statsParam, 10)
          return Number.isInteger(n) && availableYears.includes(n) ? n : null
        })()

  // Global Rating: 유저 제출 리뷰(RefereeReview) 기준으로 집계. 리뷰가 없을 때만 RefereeStats 사용
  const reviews = referee.reviews as Array<{ rating: number; role: string }>
  const totalVotes = reviews.length
  const averageRatingFromReviews =
    totalVotes > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalVotes : null
  const totalMatchesFromStats = referee.stats.reduce((sum, s) => sum + s.matchCount, 0)
  const weightedSumFromStats = referee.stats.reduce((sum, s) => sum + s.avgRating * s.matchCount, 0)
  const averageRating =
    averageRatingFromReviews ??
    (totalMatchesFromStats > 0 ? weightedSumFromStats / totalMatchesFromStats : null)

  const roleCounts = await prisma.matchReferee.groupBy({
    by: ["role"],
    where: {
      refereeId: referee.id,
      ...(statsYear != null
        ? { match: { round: { league: { season: { year: statsYear } } } } }
        : {}),
    },
    _count: { id: true },
  })
  const countByRole = Object.fromEntries(
    roleCounts.map((r) => [r.role, r._count.id])
  ) as Record<string, number>
  const totalAssignments = Object.values(countByRole).reduce((a, b) => a + b, 0)

  // 역할별 평점: 리뷰 기준. 없으면 RefereeStats 폴백
  const ratingByRole: Record<string, number> = {}
  const roles = ["MAIN", "ASSISTANT", "VAR", "WAITING"] as const
  for (const role of roles) {
    const roleReviews = reviews.filter((r) => r.role === role)
    if (roleReviews.length > 0) {
      ratingByRole[role] = roleReviews.reduce((s, r) => s + r.rating, 0) / roleReviews.length
    } else {
      const roleStats = referee.stats.filter((s) => s.role === role)
      const total = roleStats.reduce((s, r) => s + r.matchCount, 0)
      if (total > 0) {
        const sum = roleStats.reduce((s, r) => s + r.avgRating * r.matchCount, 0)
        ratingByRole[role] = sum / total
      }
    }
  }

  // 팀별 팬 평점: RefereeTeamStat 있으면 사용, 없으면 리뷰(RefereeReview)에서 팀별 집계 (어떤 팀 팬이 어떤 평점 줬는지)
  const byTeamIdFromReviews = new Map<
    string,
    { teamName: string; emblemPath: string | null; ratings: number[] }
  >()
  for (const r of referee.reviews) {
    const teamId = r.fanTeam?.id ?? "_unknown"
    const cur = byTeamIdFromReviews.get(teamId)
    const name = r.fanTeam?.name ?? "알 수 없음"
    const emblem = r.fanTeam?.emblemPath ?? null
    if (cur) {
      cur.ratings.push(r.rating)
    } else {
      byTeamIdFromReviews.set(teamId, { teamName: name, emblemPath: emblem, ratings: [r.rating] })
    }
  }
  const fromReviews = [...byTeamIdFromReviews.entries()].map(([, v]) => ({
    teamName: v.teamName,
    emblemPath: v.emblemPath,
    fanAverageRating: v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length,
    totalAssignments: v.ratings.length,
  }))
  const fromStats = referee.teamStats.map((ts) => ({
    teamName: ts.team.name,
    emblemPath: ts.team.emblemPath,
    fanAverageRating: ts.fanAverageRating,
    totalAssignments: ts.totalAssignments,
  }))
  const statsByTeamName = new Map<string, { teamName: string; emblemPath: string | null; fanAverageRating: number; totalAssignments: number }>()
  for (const t of fromReviews) {
    statsByTeamName.set(t.teamName, t)
  }
  for (const t of fromStats) {
    if (!statsByTeamName.has(t.teamName)) statsByTeamName.set(t.teamName, t)
  }
  const teamStatsForExpand = [...statsByTeamName.values()].sort(
    (a, b) => b.fanAverageRating - a.fanAverageRating
  )

  const reviewsByMatchId = new Map<string, typeof referee.reviews>()
  for (const r of referee.reviews) {
    const list = reviewsByMatchId.get(r.matchId) ?? []
    list.push(r)
    reviewsByMatchId.set(r.matchId, list)
  }

  const sortedMatchReferees = [...referee.matchReferees].sort((a, b) => {
    const ta = a.match.playedAt ? new Date(a.match.playedAt).getTime() : 0
    const tb = b.match.playedAt ? new Date(b.match.playedAt).getTime() : 0
    return tb - ta
  })
  const matchAssignmentsList =
    isYearValid && assignmentYear != null
      ? sortedMatchReferees.filter(
          (mr) => mr.match.round.league.season.year === assignmentYear
        )
      : sortedMatchReferees

  const formatCount = (n: number) => (n === 0 ? "—" : String(n))

  return (
    <main className="py-8 md:py-12 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          BACK
        </Link>
      </div>

      <section className="ledger-surface p-4 md:p-8 mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
                  {referee.name}
                </h1>
              </div>
              {referee.link && (
                <a
                  href={referee.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border bg-card px-3 md:px-4 py-1.5 md:py-2 text-[8px] md:text-[10px] font-bold font-mono flex items-center gap-2 hover:border-primary transition-colors"
                >
                  NAMU WIKI
                  <ExternalLink className="size-3 md:size-4" />
                </a>
              )}
            </div>

            <RefereeRatingSection
              averageRating={averageRating}
              totalVotes={totalVotes}
              ratingByRole={ratingByRole}
              teamStats={teamStatsForExpand}
            />
          </div>
        </div>
      </section>

      <section className="ledger-surface p-4 md:p-8 mb-6 md:mb-8">
        <div className="flex justify-between items-end mb-6 md:mb-8 gap-4 flex-wrap">
          <h3 className="font-mono text-xs md:text-sm font-bold tracking-widest text-muted-foreground uppercase">
            Assignment Statistics
          </h3>
          {availableYears.length > 0 && (
            <RefereeAssignmentYearFilter
              availableYears={availableYears}
              currentYear={statsYear}
              paramKey="stats"
              showAllOption
            />
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card/30 p-4 border border-border/50 text-center">
            <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-2">
              Referee
            </p>
            <p className="text-3xl md:text-4xl font-black italic font-mono">
              {formatCount(countByRole.MAIN ?? 0)}
            </p>
            <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">MATCHES</p>
          </div>
          <div className="bg-card/30 p-4 border border-border/50 text-center">
            <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-2">
              Assistance
            </p>
            <p className="text-3xl md:text-4xl font-black italic font-mono">
              {formatCount(countByRole.ASSISTANT ?? 0)}
            </p>
            <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">MATCHES</p>
          </div>
          <div className="bg-card/30 p-4 border border-border/50 text-center">
            <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-2">
              Waiting
            </p>
            <p className="text-3xl md:text-4xl font-black italic font-mono">
              {formatCount(countByRole.WAITING ?? 0)}
            </p>
            <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">MATCHES</p>
          </div>
          <div className="bg-card/30 p-4 border border-border/50 text-center">
            <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-2">
              VAR
            </p>
            <p className="text-3xl md:text-4xl font-black italic font-mono">
              {formatCount(countByRole.VAR ?? 0)}
            </p>
            <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">MATCHES</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border text-center">
          <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-1">
            Total Assignments
          </p>
          <p className="text-3xl md:text-4xl font-black italic font-mono">{totalAssignments}</p>
        </div>
      </section>

      <section className="ledger-surface p-4 md:p-8 mb-6 md:mb-8">
        <div className="flex justify-between items-end mb-6 md:mb-8 gap-4 flex-wrap">
          <h3 className="font-mono text-xs md:text-sm font-bold tracking-widest text-muted-foreground uppercase">
            Match Assignments
          </h3>
          {availableYears.length > 0 && (
            <RefereeAssignmentYearFilter
              availableYears={availableYears}
              currentYear={assignmentYear}
              paramKey="year"
            />
          )}
        </div>
        <div className="space-y-3 md:space-y-4">
          {matchAssignmentsList.map((mr) => {
            const m = mr.match
            const matchReviews = reviewsByMatchId.get(m.id) ?? []
            const matchAvg =
              matchReviews.length > 0
                ? matchReviews.reduce((s, r) => s + r.rating, 0) / matchReviews.length
                : null
            const matchPath = getMatchDetailPathWithBack(
              {
                roundOrder: m.roundOrder,
                round: {
                  slug: m.round.slug,
                  league: {
                    slug: m.round.league.slug,
                    season: { year: m.round.league.season.year },
                  },
                },
              },
              `/referees/${referee.slug}`
            )
            const dateStr = m.playedAt
              ? new Date(m.playedAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"
            return (
              <RefereeMatchRow
                key={mr.id}
                matchDate={dateStr}
                homeName={m.homeTeam.name}
                awayName={m.awayTeam.name}
                homeEmblem={m.homeTeam.emblemPath}
                awayEmblem={m.awayTeam.emblemPath}
                role={mr.role}
                matchRating={matchAvg}
                matchPath={matchPath}
                reviews={matchReviews.map((rev) => ({
                  userName: rev.user.name,
                  userImage: rev.user.image ?? null,
                  fanTeamName: rev.fanTeam?.name ?? null,
                  fanTeamEmblem: (rev.fanTeam as unknown as { emblemPath: string | null } | null)?.emblemPath ?? null,
                  rating: rev.rating,
                  comment: rev.comment,
                }))}
              />
            )
          })}
        </div>
        {matchAssignmentsList.length === 0 && (
          <p className="font-mono text-[10px] text-muted-foreground">배정된 경기가 없습니다.</p>
        )}
      </section>
    </main>
  )
}
