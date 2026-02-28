import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminResultsFilter } from "./AdminResultsFilter"
import { AdminResultsMatchList } from "./AdminResultsMatchList"
import { AdminBulkResultUpload } from "./AdminBulkResultUpload"

export const metadata = {
  title: "경기 결과 | 관리자 | See VAR",
  description: "경기 결과·상태 수동 반영",
}

type SearchParams = Promise<{ year?: string; league?: string; round?: string }>

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const yearStr = params.year
  const leagueSlug = params.league
  const roundSlug = params.round

  const seasons = await prisma.season.findMany({
    orderBy: { year: "desc" },
    select: { id: true, year: true },
  })
  if (seasons.length === 0) {
    return (
      <main className="max-w-4xl mx-auto pb-12">
        <p className="font-mono text-muted-foreground">시즌이 없습니다.</p>
      </main>
    )
  }

  const year = yearStr ? parseInt(yearStr, 10) : seasons[0].year
  const season = seasons.find((s) => s.year === year) ?? seasons[0]
  const leagues = await prisma.league.findMany({
    where: { seasonId: season.id },
    orderBy: { slug: "asc" },
    select: { id: true, name: true, slug: true },
  })
  const leagueSlugRes = leagueSlug || leagues[0]?.slug
  const league = leagues.find((l) => l.slug === leagueSlugRes) ?? leagues[0]
  if (!league && leagues.length > 0) redirect(`/admin/results?year=${season.year}&league=${leagues[0].slug}`)

  let rounds: { id: string; number: number; slug: string }[] = []
  if (league) {
    const rows = await prisma.round.findMany({
      where: { leagueId: league.id },
      orderBy: { number: "asc" },
      select: { id: true, number: true, slug: true },
    })
    rounds = rows
  }
  const roundSlugRes = roundSlug || rounds[0]?.slug
  const round = rounds.find((r) => r.slug === roundSlugRes) ?? rounds[0]
  if (league && rounds.length > 0 && !round) {
    redirect(`/admin/results?year=${season.year}&league=${league.slug}&round=${rounds[0].slug}`)
  }

  let matches: Awaited<
    ReturnType<
      typeof prisma.match.findMany<{
        include: { homeTeam: true; awayTeam: true }
      }>
    >
  > = []
  if (round) {
    matches = await prisma.match.findMany({
      where: { roundId: round.id },
      orderBy: [{ roundOrder: "asc" }],
      include: { homeTeam: true, awayTeam: true },
    })
  }

  const baseUrl = "/admin/results"

  return (
    <main className="max-w-4xl mx-auto pb-12 md:pb-16">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 관리자
        </Link>
      </div>
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
        경기 결과
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        경기 상태(SCHEDULED/LIVE/FINISHED/CANCELLED), 스코어, 심판별 옐로/레드 카드를 수동 반영하거나 JSON 파일로 일괄 반영할 수 있습니다.
      </p>

      <AdminResultsFilter
        seasons={seasons}
        leagues={leagues}
        rounds={rounds}
        currentYear={season.year}
        currentLeagueSlug={league?.slug ?? ""}
        currentRoundSlug={round?.slug ?? ""}
        baseUrl={baseUrl}
      />

      <AdminBulkResultUpload />

      {round && (
        <AdminResultsMatchList
          matches={matches}
          seasonYear={season.year}
          leagueSlug={league?.slug ?? ""}
          roundSlug={round.slug}
        />
      )}
    </main>
  )
}
