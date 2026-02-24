import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import { TeamDetailSection } from "@/components/teams/TeamDetailSection"

export const metadata = {
  title: "TEAM ANALYSIS | See VAR",
  description: "팀별 경기 데이터와 심판 상성 데이터",
}

type SearchParams = Promise<{ team?: string }>

export default async function TeamsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const teamId = params.team ?? ""

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { leagues: true },
  })

  let selectedTeam: { id: string; name: string } | null = null
  let compatibility: { high: { id: string; slug: string; name: string; fanAverageRating: number; totalAssignments: number; roleCounts: Record<string, number> | null } | null; low: { id: string; slug: string; name: string; fanAverageRating: number; totalAssignments: number; roleCounts: Record<string, number> | null } | null } = {
    high: null,
    low: null,
  }
  let assignments: { id: string; name: string; fanAverageRating: number; totalAssignments: number; roleCounts: Record<string, number> | null }[] = []
  let matches: {
    id: string
    matchPath: string
    playedAt: Date | null
    status: string
    scoreHome: number | null
    scoreAway: number | null
    homeTeam: { id: string; name: string; emblemPath: string | null }
    awayTeam: { id: string; name: string; emblemPath: string | null }
    matchReferees: { role: string; referee: { id: string; slug: string; name: string } }[]
  }[] = []

  if (teamId) {
    const team = teams.find((t) => t.id === teamId) ?? null
    if (team) {
      selectedTeam = { id: team.id, name: team.name }

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
      compatibility = {
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

      assignments = teamStats.map((s) => ({
        id: s.referee.id,
        slug: s.referee.slug,
        name: s.referee.name,
        fanAverageRating: s.fanAverageRating,
        totalAssignments: s.totalAssignments,
        roleCounts: s.roleCounts as Record<string, number> | null,
      }))

      // 같은 경기(날짜·홈·어웨이 동일)가 두 번 나오지 않도록 중복 제거
      const seenFixture = new Set<string>()
      const uniqueMatchList = matchList.filter((m) => {
        const key = `${m.playedAt?.getTime() ?? 0}-${m.homeTeamId}-${m.awayTeamId}`
        if (seenFixture.has(key)) return false
        seenFixture.add(key)
        return true
      })

      matches = uniqueMatchList.map((m) => ({
        id: m.id,
        matchPath: getMatchDetailPath(m),
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
    }
  }

  return (
    <main className="py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
          TEAM ANALYSIS
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
          팀별 경기 데이터와 심판 상성 데이터를 확인하세요.
        </p>
      </header>

      <div className="ledger-surface p-4 md:p-8 mb-8 md:mb-12 border border-border">
        <h3 className="font-mono text-[10px] md:text-sm font-black tracking-widest text-muted-foreground uppercase mb-6 md:mb-8">
          Select Team
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={teamId === t.id ? "/teams" : `/teams?team=${t.id}`}
              className={`team-btn flex flex-col items-center gap-2 group border rounded-md p-3 transition-all duration-300 hover:-translate-y-0.5 ${
                teamId === t.id ? "active border-primary opacity-100" : "opacity-60 hover:opacity-100"
              }`}
            >
              <div className="w-16 h-16 bg-card border border-border flex items-center justify-center overflow-hidden rounded">
                {t.emblemPath ? (
                  <img src={t.emblemPath} alt="" className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>
              <span className="font-mono text-xs font-bold text-center leading-tight">{t.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {teams.length === 0 && <p className="font-mono text-muted-foreground">등록된 팀이 없습니다.</p>}

      {selectedTeam ? (
        <TeamDetailSection
          teamName={selectedTeam.name}
          teamId={selectedTeam.id}
          compatibility={compatibility}
          assignments={assignments}
          matches={matches}
        />
      ) : (
        <div className="ledger-surface p-8 md:p-12 border border-border text-center">
          <p className="font-mono text-sm text-muted-foreground">
            위에서 팀을 선택하면 해당 팀과 심판의 호환성, 자주 배정된 심판, 경기 이력이 하단에 표시됩니다.
          </p>
        </div>
      )}
    </main>
  )
}
