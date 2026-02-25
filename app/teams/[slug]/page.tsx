import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPathWithBack } from "@/lib/match-url"
import { TeamDetailSection } from "@/components/teams/TeamDetailSection"
import { ChevronLeft } from "lucide-react"

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{ back?: string }>

function sanitizeBackUrl(back: string | undefined): string {
  if (!back || typeof back !== "string") return "/teams"
  const decoded = decodeURIComponent(back)
  if (!decoded.startsWith("/") || decoded.includes("//")) return "/teams"
  return decoded
}

/** URL 세그먼트 → DB slug. "리그-엠블럼키" 형식, 첫 번째 - 이후만 _로 치환 */
function paramToSlug(param: string): string {
  const firstDash = param.indexOf("-")
  if (firstDash === -1) return param
  const league = param.slice(0, firstDash)
  const emblemPart = param.slice(firstDash + 1).replace(/-/g, "_")
  return `${league}-${emblemPart}`
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const teamSlug = paramToSlug(slug)
  const team = await prisma.team.findFirst({
    where: slug.includes("-") ? { slug: teamSlug } : { id: slug },
    select: { name: true },
  })
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
  const { back: backParam } = await searchParams
  const backHref = sanitizeBackUrl(backParam)
  const teamSlug = paramToSlug(slug)

  const team = await prisma.team.findFirst({
    where: slug.includes("-") ? { slug: teamSlug } : { id: slug },
    include: { leagues: true },
  })
  if (!team) notFound()

  const teamId = team.id
  const [teamStats, matchList] = await Promise.all([
    prisma.refereeTeamStat.findMany({
      where: { teamId },
      include: { referee: true },
      orderBy: { totalAssignments: "desc" },
    }),
    prisma.match.findMany({
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      orderBy: { playedAt: "desc" },
      take: 20,
      include: {
        homeTeam: true,
        awayTeam: true,
        round: { include: { league: { include: { season: true } } } },
        matchReferees: { include: { referee: true } },
      },
    }),
  ])

  const withRating = teamStats.filter((s) => s.fanAverageRating > 0)
  const sortedByRating = [...withRating].sort((a, b) => b.fanAverageRating - a.fanAverageRating)
  const compatibility = {
    high: sortedByRating[0]
      ? {
          id: sortedByRating[0].referee.id,
          slug: sortedByRating[0].referee.slug,
          name: sortedByRating[0].referee.name,
          fanAverageRating: sortedByRating[0].fanAverageRating,
          totalAssignments: sortedByRating[0].totalAssignments,
          roleCounts: sortedByRating[0].roleCounts as Record<string, number> | null,
        }
      : null,
    low:
      sortedByRating.length >= 2
        ? {
            id: sortedByRating[sortedByRating.length - 1].referee.id,
            slug: sortedByRating[sortedByRating.length - 1].referee.slug,
            name: sortedByRating[sortedByRating.length - 1].referee.name,
            fanAverageRating: sortedByRating[sortedByRating.length - 1].fanAverageRating,
            totalAssignments: sortedByRating[sortedByRating.length - 1].totalAssignments,
            roleCounts: sortedByRating[sortedByRating.length - 1].roleCounts as Record<string, number> | null,
          }
        : null,
  }

  const assignments = teamStats.map((s) => ({
    id: s.referee.id,
    slug: s.referee.slug,
    name: s.referee.name,
    fanAverageRating: s.fanAverageRating,
    totalAssignments: s.totalAssignments,
    roleCounts: s.roleCounts as Record<string, number> | null,
  }))

  const seenFixture = new Set<string>()
  const uniqueMatchList = matchList.filter((m) => {
    const key = `${m.playedAt?.getTime() ?? 0}-${m.homeTeamId}-${m.awayTeamId}`
    if (seenFixture.has(key)) return false
    seenFixture.add(key)
    return true
  })

  const backPath = `/teams`
  const matches = uniqueMatchList.map((m) => ({
    id: m.id,
    matchPath: getMatchDetailPathWithBack(m, backPath),
    playedAt: m.playedAt,
    status: m.status,
    scoreHome: m.scoreHome,
    scoreAway: m.scoreAway,
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

  return (
    <main className="py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 font-mono text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          {backHref !== "/teams" ? "BACK" : "BACK TO LIST"}
        </Link>
      </div>
      <header className="mb-8 md:mb-12">
        <p className="font-mono text-[10px] md:text-xs font-black tracking-widest text-muted-foreground uppercase mb-4 md:mb-6">
          TEAM ANALYSIS
        </p>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-card border border-border flex items-center justify-center overflow-hidden rounded-lg shrink-0">
            {team.emblemPath ? (
              <img src={team.emblemPath} alt="" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
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
        compatibility={compatibility}
        assignments={assignments}
        matches={matches}
      />
    </main>
  )
}
