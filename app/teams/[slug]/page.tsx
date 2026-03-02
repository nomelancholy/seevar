import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPathWithBack } from "@/lib/match-url"
import { EmblemImage } from "@/components/ui/EmblemImage"
import { TeamDetailSection } from "@/components/teams/TeamDetailSection"
import { ChevronLeft } from "lucide-react"

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{ back?: string; year?: string }>

function sanitizeBackUrl(back: string | undefined): string {
  if (!back || typeof back !== "string") return "/teams"
  const decoded = decodeURIComponent(back)
  if (!decoded.startsWith("/") || decoded.includes("//")) return "/teams"
  return decoded
}

/** URL 세그먼트(gangwon-fc) → DB slug(gangwon_fc) */
function paramToDbSlug(param: string): string {
  return param.replace(/-/g, "_")
}

async function findTeamForSlug(slug: string) {
  const bySlug = slug.includes("-")
  const team = await prisma.team.findFirst({
    where: bySlug ? { slug: paramToDbSlug(slug) } : { id: slug },
    include: { leagues: true },
  })
  return team ?? null
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const team = await findTeamForSlug(slug).then((t) => (t ? { name: t.name } : null))
  if (!team) return { title: "TEAM ANALYSIS | See VAR" }
  return {
    title: `${team.name} | TEAM ANALYSIS | See VAR`,
    description: `${team.name} 팀 경기 데이터와 심판 상성`,
  }
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { slug } = await params
  const { back: backParam, year: yearParam } = await searchParams
  const backHref = sanitizeBackUrl(backParam)
  const filterYear =
    yearParam != null && yearParam !== ""
      ? parseInt(yearParam, 10)
      : null
  const isYearValid = filterYear == null || Number.isInteger(filterYear)

  const team = await findTeamForSlug(slug)
  if (!team) notFound()

  const teamId = team.id
  const [teamStats, matchList, teamFanReviews] = await Promise.all([
    prisma.refereeTeamStat.findMany({
      where: { teamId },
      include: { referee: true },
      orderBy: { totalAssignments: "desc" },
    }),
    prisma.match.findMany({
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      orderBy: { playedAt: "desc" },
      take: 50,
      include: {
        homeTeam: true,
        awayTeam: true,
        round: { include: { league: { include: { season: true } } } },
        matchReferees: { include: { referee: true } },
      },
    }),
    prisma.refereeReview.findMany({
      where: { fanTeamId: teamId, status: "VISIBLE" },
      select: { refereeId: true, rating: true, referee: { select: { id: true, slug: true, name: true } } },
    }),
  ])

  // 이 팀 팬이 심판에게 준 평점 집계 (RefereeReview 기준 → RefereeTeamStat 비어 있어도 표시)
  const byRefereeFromReviews = new Map<
    string,
    { referee: { id: string; slug: string; name: string }; ratings: number[] }
  >()
  for (const r of teamFanReviews) {
    const cur = byRefereeFromReviews.get(r.refereeId)
    const ref = r.referee
    if (cur) {
      cur.ratings.push(r.rating)
    } else {
      byRefereeFromReviews.set(r.refereeId, {
        referee: { id: ref.id, slug: ref.slug, name: ref.name },
        ratings: [r.rating],
      })
    }
  }
  const fanRatingsPerReferee = [...byRefereeFromReviews.entries()].map(([, v]) => ({
    id: v.referee.id,
    slug: v.referee.slug,
    name: v.referee.name,
    fanAverageRating: v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length,
    totalAssignments: v.ratings.length,
    roleCounts: null as Record<string, number> | null,
  }))

  // 배정 집계: 경기 목록(matchList)에서 심판별 배정 횟수·역할 집계 (RefereeTeamStat 미갱신 시에도 실제 경기 기준 표시)
  const derivedByReferee = new Map<
    string,
    { referee: { id: string; slug: string; name: string }; totalAssignments: number; roleCounts: Record<string, number> }
  >()
  for (const m of matchList) {
    for (const mr of m.matchReferees) {
      const r = mr.referee
      const cur = derivedByReferee.get(r.id)
      const roleCounts: Record<string, number> = cur?.roleCounts ? { ...cur.roleCounts } : {}
      roleCounts[mr.role] = (roleCounts[mr.role] ?? 0) + 1
      derivedByReferee.set(r.id, {
        referee: r,
        totalAssignments: (cur?.totalAssignments ?? 0) + 1,
        roleCounts,
      })
    }
  }
  const derivedAssignments = [...derivedByReferee.values()]
    .sort((a, b) => b.totalAssignments - a.totalAssignments)
    .map((s) => {
      const fromStat = teamStats.find((t) => t.refereeId === s.referee.id)
      const fromReviews = fanRatingsPerReferee.find((f) => f.id === s.referee.id)
      return {
        id: s.referee.id,
        slug: s.referee.slug,
        name: s.referee.name,
        fanAverageRating: fromStat?.fanAverageRating ?? fromReviews?.fanAverageRating ?? 0,
        totalAssignments: s.totalAssignments,
        roleCounts: s.roleCounts as Record<string, number> | null,
      }
    })

  const assignments =
    derivedAssignments.length > 0
      ? derivedAssignments
      : teamStats.map((s) => ({
          id: s.referee.id,
          slug: s.referee.slug,
          name: s.referee.name,
          fanAverageRating: s.fanAverageRating,
          totalAssignments: s.totalAssignments,
          roleCounts: s.roleCounts as Record<string, number> | null,
        }))

  // REFEREE COMPATIBILITY: RefereeTeamStat 우선, 없으면 이 팀 팬 리뷰(RefereeReview) 집계 사용
  const withRatingFromStats = teamStats.filter((s) => s.fanAverageRating > 0)
  const withRatingFromReviews = fanRatingsPerReferee.filter((r) => r.fanAverageRating > 0)
  const combinedForCompatibility = [
    ...withRatingFromStats.map((s) => ({
      id: s.referee.id,
      slug: s.referee.slug,
      name: s.referee.name,
      fanAverageRating: s.fanAverageRating,
      totalAssignments: s.totalAssignments,
      roleCounts: s.roleCounts as Record<string, number> | null,
    })),
    ...withRatingFromReviews.filter(
      (r) => !withRatingFromStats.some((s) => s.refereeId === r.id)
    ).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      fanAverageRating: r.fanAverageRating,
      totalAssignments: r.totalAssignments,
      roleCounts: r.roleCounts,
    })),
  ]
  const sortedByRating = [...combinedForCompatibility].sort(
    (a, b) => b.fanAverageRating - a.fanAverageRating
  )
  const compatibility = {
    high: sortedByRating[0]
      ? {
          id: sortedByRating[0].id,
          slug: sortedByRating[0].slug,
          name: sortedByRating[0].name,
          fanAverageRating: sortedByRating[0].fanAverageRating,
          totalAssignments: sortedByRating[0].totalAssignments,
          roleCounts: sortedByRating[0].roleCounts,
        }
      : null,
    low:
      sortedByRating.length >= 2
        ? {
            id: sortedByRating[sortedByRating.length - 1].id,
            slug: sortedByRating[sortedByRating.length - 1].slug,
            name: sortedByRating[sortedByRating.length - 1].name,
            fanAverageRating: sortedByRating[sortedByRating.length - 1].fanAverageRating,
            totalAssignments: sortedByRating[sortedByRating.length - 1].totalAssignments,
            roleCounts: sortedByRating[sortedByRating.length - 1].roleCounts,
          }
        : null,
  }

  const seenFixture = new Set<string>()
  const uniqueMatchList = matchList.filter((m) => {
    const key = `${m.playedAt?.getTime() ?? 0}-${m.homeTeamId}-${m.awayTeamId}`
    if (seenFixture.has(key)) return false
    seenFixture.add(key)
    return true
  })

  const backPath = `/teams`
  const allMatches = uniqueMatchList.map((m) => ({
    id: m.id,
    matchPath: getMatchDetailPathWithBack(m, backPath),
    playedAt: m.playedAt,
    status: m.status,
    scoreHome: m.scoreHome,
    scoreAway: m.scoreAway,
    venue: m.venue ?? null,
    homeTeam: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      emblemPath: m.homeTeam.emblemPath,
    },
    awayTeam: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      emblemPath: m.awayTeam.emblemPath,
    },
    matchReferees: m.matchReferees.map((mr) => ({
      role: mr.role,
      referee: { id: mr.referee.id, slug: mr.referee.slug, name: mr.referee.name },
    })),
  }))

  const availableYears = [
    ...new Set(
      allMatches
        .map((m) => (m.playedAt != null ? new Date(m.playedAt).getFullYear() : null))
        .filter((y): y is number => y != null)
    ),
  ].sort((a, b) => b - a)

  // 심판별 이 팀에게 부여한 옐로/레드 카드 (RefereeTeamStat)
  const cardsByReferee = teamStats
    .filter((s) => (s.totalYellowCards ?? 0) > 0 || (s.totalRedCards ?? 0) > 0)
    .map((s) => ({
      id: s.referee.id,
      slug: s.referee.slug,
      name: s.referee.name,
      totalYellowCards: s.totalYellowCards ?? 0,
      totalRedCards: s.totalRedCards ?? 0,
    }))
    .sort((a, b) => b.totalYellowCards + b.totalRedCards - (a.totalYellowCards + a.totalRedCards))

  const latestYear = availableYears[0] ?? null
  const effectiveYear =
    isYearValid && filterYear != null
      ? filterYear
      : latestYear

  const matches =
    effectiveYear != null
      ? allMatches.filter((m) => {
          const y = m.playedAt != null ? new Date(m.playedAt).getFullYear() : null
          return y === effectiveYear
        })
      : allMatches

  return (
    <main className="py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 font-mono text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          BACK
        </Link>
      </div>
      <header className="mb-8 md:mb-12">
        <p className="font-mono text-[10px] md:text-xs font-black tracking-widest text-muted-foreground uppercase mb-4 md:mb-6">
          TEAM ANALYSIS
        </p>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-card border border-border flex items-center justify-center overflow-hidden rounded-lg shrink-0">
            {team.emblemPath ? (
              <EmblemImage src={team.emblemPath} width={64} height={64} className="w-12 h-12 md:w-16 md:h-16 object-contain" />
            ) : (
              <span className="text-muted-foreground text-2xl font-black">—</span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black italic tracking-tighter uppercase">
            {team.name}
          </h1>
        </div>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground mt-4 md:mt-5">
          경기 데이터 및 심판 상성
        </p>
      </header>

      <TeamDetailSection
        teamName={team.name}
        teamId={team.id}
        refereeBackPath={`/teams/${slug}`}
        compatibility={compatibility}
        compatibilityList={combinedForCompatibility}
        assignments={assignments}
        cardsByReferee={cardsByReferee}
        matches={matches}
        availableYears={availableYears}
        currentYear={effectiveYear}
      />
    </main>
  )
}
