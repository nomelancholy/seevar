import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import { RefereeTeamRatingsExpand } from "@/components/referees/RefereeTeamRatingsExpand"
import { RefereeMatchRow } from "@/components/referees/RefereeMatchRow"
import { RefereeAssignmentYearFilter } from "@/components/referees/RefereeAssignmentYearFilter"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ year?: string }>
}

const ROLE_LABEL: Record<string, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  VAR: "VAR",
  WAITING: "대기심",
}

async function resolveReferee(param: string) {
  const bySlug = await prisma.referee.findUnique({
    where: { slug: param } as unknown as Parameters<typeof prisma.referee.findUnique>[0]["where"],
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
          user: { select: { name: true } },
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
          user: { select: { name: true } },
        },
      },
    },
  })
  if (byId) return { referee: byId, byId: true }
  return null
}

export async function generateMetadata({ params }: Props) {
  const { id: param } = await params
  const resolved = await resolveReferee(param)
  if (!resolved) return { title: "심판 없음 | See VAR" }
  return { title: `${resolved.referee.name} | REFEREE | See VAR` }
}

export default async function RefereeDetailPage({ params, searchParams }: Props) {
  const { id: param } = await params
  const { year: yearParam } = await searchParams
  const resolved = await resolveReferee(param)
  if (!resolved) notFound()
  const { referee: rawReferee, byId } = resolved
  const referee = rawReferee as typeof rawReferee & {
    id: string
    slug: string
    stats: Array<{ season: { year: number }; role: string; matchCount: number; avgRating: number }>
    teamStats: Array<{ team: { name: string; emblemPath: string | null }; fanAverageRating: number; totalAssignments: number }>
    matchReferees: Array<{ id: string; match: { id: string; playedAt: Date | null; roundOrder: number; homeTeam: { name: string; emblemPath: string | null }; awayTeam: { name: string; emblemPath: string | null }; round: { slug: string; league: { slug: string; season: { year: number } } } }; role: string }>
    reviews: Array<{ matchId: string; user: { name: string | null }; fanTeam: { name: string; emblemPath: string | null } | null; rating: number; comment: string | null }>
  }

  if (byId) redirect(`/referees/${referee.slug}`)

  const yearsFromStats = referee.stats.map((s) => s.season.year)
  const yearsFromMatches = referee.matchReferees.map(
    (mr) => mr.match.round.league.season.year
  )
  const availableYears = [...new Set([...yearsFromStats, ...yearsFromMatches])].sort(
    (a, b) => b - a
  )
  const assignmentYear =
    yearParam != null && yearParam !== ""
      ? parseInt(yearParam, 10)
      : null
  const isYearValid =
    assignmentYear == null || (Number.isInteger(assignmentYear) && availableYears.includes(assignmentYear))

  const totalMatches = referee.stats.reduce((sum, s) => sum + s.matchCount, 0)
  const weightedSum = referee.stats.reduce((sum, s) => sum + s.avgRating * s.matchCount, 0)
  const averageRating = totalMatches > 0 ? weightedSum / totalMatches : null

  const roleCounts = await prisma.matchReferee.groupBy({
    by: ["role"],
    where: {
      refereeId: referee.id,
      ...(isYearValid && assignmentYear != null
        ? { match: { round: { league: { season: { year: assignmentYear } } } } }
        : {}),
    },
    _count: { id: true },
  })
  const countByRole = Object.fromEntries(
    roleCounts.map((r) => [r.role, r._count.id])
  ) as Record<string, number>
  const totalAssignments = Object.values(countByRole).reduce((a, b) => a + b, 0)

  // Per-role weighted average rating from stats
  const ratingByRole: Record<string, number> = {}
  const roles = ["MAIN", "ASSISTANT", "VAR", "WAITING"] as const
  for (const role of roles) {
    const roleStats = referee.stats.filter((s) => s.role === role)
    const total = roleStats.reduce((s, r) => s + r.matchCount, 0)
    if (total > 0) {
      const sum = roleStats.reduce((s, r) => s + r.avgRating * r.matchCount, 0)
      ratingByRole[role] = sum / total
    }
  }

  const teamStatsForExpand = referee.teamStats.map((ts) => ({
    teamName: ts.team.name,
    emblemPath: (ts.team as unknown as { emblemPath: string | null }).emblemPath,
    fanAverageRating: ts.fanAverageRating,
    totalAssignments: ts.totalAssignments,
  }))

  const reviewsByMatchId = new Map<string, typeof referee.reviews>()
  for (const r of referee.reviews) {
    const list = reviewsByMatchId.get(r.matchId) ?? []
    list.push(r)
    reviewsByMatchId.set(r.matchId, list)
  }

  const recentMatchReferees = [...referee.matchReferees]
    .sort((a, b) => {
      const ta = a.match.playedAt ? new Date(a.match.playedAt).getTime() : 0
      const tb = b.match.playedAt ? new Date(b.match.playedAt).getTime() : 0
      return tb - ta
    })
    .slice(0, 20)

  const rating = averageRating ?? 0
  const isTop = rating >= 3.5
  const isLow = rating > 0 && rating < 2.5

  const formatCount = (n: number) => (n === 0 ? "—" : String(n))

  return (
    <main className="py-8 md:py-12 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/referees"
          className="flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          심판 목록
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

            <div className="mt-6 md:mt-8 border-t border-border pt-4 md:pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="flex flex-col">
                    <div className="text-[8px] md:text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      Global Rating
                    </div>
                    <div className="text-[7px] md:text-[9px] font-mono text-primary opacity-70">
                      TOTAL VOTES: {totalMatches > 0 ? (totalMatches * 85).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="flex items-end gap-1 md:gap-2">
                    <span
                      className={`text-3xl md:text-4xl font-black italic ${
                        isTop ? "text-primary" : isLow ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {averageRating != null ? averageRating.toFixed(1) : "—"}
                    </span>
                    <span className="text-muted-foreground font-bold mb-0.5 md:mb-1 text-xs md:text-base">
                      / 5.0
                    </span>
                  </div>
                </div>
              </div>

              <RefereeTeamRatingsExpand teamStats={teamStatsForExpand} />
            </div>

            {/* Role-based rating cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 md:mt-8 border-t border-border pt-4 md:pt-6">
              {roles.map((role) => (
                <div
                  key={role}
                  className="bg-card/30 p-3 md:p-4 border border-border/50 text-center"
                >
                  <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-1 md:mb-2">
                    {ROLE_LABEL[role]}
                  </p>
                  <p className="text-2xl md:text-3xl font-black italic font-mono">
                    {ratingByRole[role] != null ? `${ratingByRole[role].toFixed(1)}` : "—"}
                  </p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">/ 5.0</p>
                </div>
              ))}
            </div>
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
              currentYear={isYearValid ? assignmentYear : null}
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
        <h3 className="font-mono text-xs md:text-sm font-bold tracking-widest text-muted-foreground uppercase mb-6 md:mb-8">
          Recent Match Assignments
        </h3>
        <div className="space-y-3 md:space-y-4">
          {recentMatchReferees.map((mr) => {
            const m = mr.match
            const matchReviews = reviewsByMatchId.get(m.id) ?? []
            const matchAvg =
              matchReviews.length > 0
                ? matchReviews.reduce((s, r) => s + r.rating, 0) / matchReviews.length
                : null
            const matchPath = getMatchDetailPath({
              roundOrder: m.roundOrder,
              round: {
                slug: m.round.slug,
                league: {
                  slug: m.round.league.slug,
                  season: { year: m.round.league.season.year },
                },
              },
            })
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
                  fanTeamName: rev.fanTeam?.name ?? null,
                  fanTeamEmblem: (rev.fanTeam as unknown as { emblemPath: string | null } | null)?.emblemPath ?? null,
                  rating: rev.rating,
                  comment: rev.comment,
                }))}
              />
            )
          })}
        </div>
        {recentMatchReferees.length === 0 && (
          <p className="font-mono text-[10px] text-muted-foreground">배정된 경기가 없습니다.</p>
        )}
      </section>
    </main>
  )
}
