import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPathWithBack } from "@/lib/match-url"
import { EmblemImage } from "@/components/ui/EmblemImage"
import { TeamDetailSection } from "@/components/teams/TeamDetailSection"
import { ChevronLeft } from "lucide-react"
import { KakaoAdFit } from "@/components/ads/KakaoAdFit"
import type { RefereeRole } from "@prisma/client"

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{
  back?: string
  year?: string
  sort?: string
  stats?: string
  statsLeague?: string
  statsRole?: string
}>

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
  if (!team) return { title: "팀 정보 | SEE VAR" }
  return {
    title: `${team.name} | 팀 정보 | SEE VAR`,
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
  const {
    back: backParam,
    year: yearParam,
    sort: sortParam,
    stats: statsParam,
    statsLeague: statsLeagueParam,
    statsRole: statsRoleParam,
  } = await searchParams
  const backHref = sanitizeBackUrl(backParam)
  const filterYear =
    yearParam != null && yearParam !== ""
      ? parseInt(yearParam, 10)
      : null
  const isYearValid = filterYear == null || Number.isInteger(filterYear)
  const sortOrder = sortParam === "roundDesc" ? "roundDesc" : "round"

  const team = await findTeamForSlug(slug)
  if (!team) notFound()

  const teamId = team.id
  const [allTeamStats, matchList] = await Promise.all([
    prisma.refereeTeamStat.findMany({
      where: { teamId },
      include: {
        referee: true,
        season: { select: { year: true } },
        league: { select: { name: true, slug: true } },
      },
      orderBy: { totalAssignments: "desc" },
    }),
    prisma.match.findMany({
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      orderBy: { playedAt: "desc" },
      include: {
        homeTeam: true,
        awayTeam: true,
        round: { include: { league: { include: { season: true } } } },
        matchReferees: { include: { referee: true } },
      },
    }),
  ])

  const statAvailableYears = Array.from(
    new Set(allTeamStats.map((stat) => stat.season.year))
  ).sort((a, b) => b - a)
  const statAvailableLeagues = Array.from(
    new Map(allTeamStats.map((stat) => [stat.league.slug, stat.league])).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "ko"))
  const statYear =
    statsParam && statsParam !== "all"
      ? (() => {
          const parsed = parseInt(statsParam, 10)
          return Number.isInteger(parsed) && statAvailableYears.includes(parsed) ? parsed : null
        })()
      : null
  const statLeague =
    statsLeagueParam && statsLeagueParam !== "all" &&
    statAvailableLeagues.some((league) => league.slug === statsLeagueParam)
      ? statsLeagueParam
      : null
  const validRoles: RefereeRole[] = ["MAIN", "ASSISTANT", "WAITING", "VAR"]
  const statRole = validRoles.includes(statsRoleParam as RefereeRole)
    ? (statsRoleParam as RefereeRole)
    : null

  const teamStats = allTeamStats.filter((stat) =>
    (statYear == null || stat.season.year === statYear) &&
    (statLeague == null || stat.league.slug === statLeague) &&
    (statRole == null || stat.role === statRole)
  )

  const byReferee = new Map<string, {
    id: string
    slug: string
    name: string
    weightedRating: number
    fanRatingCount: number
    totalAssignments: number
    roleCounts: Record<string, number>
    totalYellowCards: number
    totalRedCards: number
  }>()
  for (const stat of teamStats) {
    const current = byReferee.get(stat.refereeId)
    const roleCounts = { ...(current?.roleCounts ?? {}) }
    roleCounts[stat.role] = (roleCounts[stat.role] ?? 0) + stat.totalAssignments
    byReferee.set(stat.refereeId, {
      id: stat.referee.id,
      slug: stat.referee.slug,
      name: stat.referee.name,
      weightedRating:
        (current?.weightedRating ?? 0) + stat.fanAverageRating * stat.fanRatingCount,
      fanRatingCount: (current?.fanRatingCount ?? 0) + stat.fanRatingCount,
      totalAssignments: (current?.totalAssignments ?? 0) + stat.totalAssignments,
      roleCounts,
      totalYellowCards: (current?.totalYellowCards ?? 0) + stat.totalYellowCards,
      totalRedCards: (current?.totalRedCards ?? 0) + stat.totalRedCards,
    })
  }

  const aggregatedStats = Array.from(byReferee.values()).map((stat) => ({
    id: stat.id,
    slug: stat.slug,
    name: stat.name,
    fanAverageRating:
      stat.fanRatingCount > 0 ? stat.weightedRating / stat.fanRatingCount : 0,
    fanRatingCount: stat.fanRatingCount,
    totalAssignments: stat.totalAssignments,
    roleCounts: stat.roleCounts,
    totalYellowCards: stat.totalYellowCards,
    totalRedCards: stat.totalRedCards,
  }))

  const assignments = aggregatedStats
    .filter((stat) => stat.totalAssignments > 0)
    .sort((a, b) => b.totalAssignments - a.totalAssignments)
  const combinedForCompatibility = aggregatedStats
    .filter((stat) => stat.fanRatingCount > 0)
    .sort((a, b) => b.fanAverageRating - a.fanAverageRating)
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
  const allMatches = uniqueMatchList.map((m) => {
    const round = m.round as { number: number; slug: string; league: { name: string; slug: string } }
    return {
      id: m.id,
      matchPath: getMatchDetailPathWithBack(m, backPath),
      playedAt: m.playedAt,
      status: m.status,
      scoreHome: m.scoreHome,
      scoreAway: m.scoreAway,
      venue: m.venue ?? null,
      roundNumber: round?.number ?? 0,
      roundSlug: round?.slug ?? "",
      leagueName: round?.league?.name ?? "",
      seasonYear: m.round.league.season.year,
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
    }
  })

  const availableYears = [
    ...new Set(
      allMatches
        .map((m) => m.seasonYear)
    ),
  ].sort((a, b) => b - a)

  const cardsByReferee = aggregatedStats
    .filter((stat) => stat.totalYellowCards > 0 || stat.totalRedCards > 0)
    .map((stat) => ({
      id: stat.id,
      slug: stat.slug,
      name: stat.name,
      totalYellowCards: stat.totalYellowCards,
      totalRedCards: stat.totalRedCards,
    }))
    .sort((a, b) => b.totalYellowCards + b.totalRedCards - (a.totalYellowCards + a.totalRedCards))

  const latestYear = availableYears[0] ?? null
  const effectiveYear =
    isYearValid && filterYear != null
      ? filterYear
      : latestYear

  const filteredByYear =
    effectiveYear != null
      ? allMatches.filter((m) => {
        return m.seasonYear === effectiveYear
      })
      : allMatches

  const matches =
    sortOrder === "roundDesc"
      ? [...filteredByYear].sort((a, b) => b.roundNumber - a.roundNumber)
      : [...filteredByYear].sort((a, b) => a.roundNumber - b.roundNumber)

  return (
    <>
      <KakaoAdFit />
      <main className="py-8 md:py-12">
        <div className="mb-6 md:mb-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 font-mono text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          뒤로 가기
        </Link>
      </div>
      <header className="mb-8 md:mb-12">
        <p className="font-mono text-[10px] md:text-xs font-black tracking-widest text-muted-foreground uppercase mb-4 md:mb-6">
          팀 정보
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
        refereeBackPath={`/teams/${slug}`}
        compatibility={compatibility}
        compatibilityList={combinedForCompatibility}
        assignments={assignments}
        cardsByReferee={cardsByReferee}
        matches={matches}
        availableYears={availableYears}
        currentYear={effectiveYear}
        statAvailableYears={statAvailableYears}
        statYear={statYear}
        statAvailableLeagues={statAvailableLeagues}
        statLeague={statLeague}
        statRole={statRole}
        matchSortOrder={sortOrder}
      />
      </main>
    </>
  )
}
