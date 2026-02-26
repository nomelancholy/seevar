import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminMatchScheduleForm } from "./AdminMatchScheduleForm"
import { AdminMatchList } from "./AdminMatchList"
import { RoundFocusToggle } from "./RoundFocusToggle"

export const metadata = {
  title: "경기 일정 | 관리자 | See VAR",
  description: "경기 일정 수정, 수동 추가·삭제",
}

type SearchParams = Promise<{ year?: string; league?: string; round?: string }>

export default async function AdminMatchesPage({
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

  const year = yearStr ? parseInt(yearStr, 10) : seasons[0]?.year
  const season = seasons.length > 0 ? (seasons.find((s) => s.year === year) ?? seasons[0]) : null

  const leagues = season
    ? await prisma.league.findMany({
        where: { seasonId: season.id },
        orderBy: { slug: "asc" },
        select: { id: true, name: true, slug: true },
      })
    : []
  const leagueSlugRes = leagueSlug || leagues[0]?.slug
  const league = leagues.find((l) => l.slug === leagueSlugRes) ?? leagues[0] ?? null
  if (season && leagues.length > 0 && !league) {
    redirect(`/admin/matches?year=${season.year}&league=${leagues[0].slug}`)
  }

  let rounds: { id: string; number: number; slug: string; isFocus: boolean }[] = []
  if (league) {
    const rows = await prisma.round.findMany({
      where: { leagueId: league.id },
      orderBy: { number: "asc" },
      select: { id: true, number: true, slug: true, isFocus: true },
    })
    rounds = rows
  }
  const roundSlugRes = roundSlug || rounds[0]?.slug
  const round = rounds.find((r) => r.slug === roundSlugRes) ?? rounds[0] ?? null
  if (league && rounds.length > 0 && !round) {
    redirect(`/admin/matches?year=${season!.year}&league=${league.slug}&round=${rounds[0].slug}`)
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

  const leagueTeams = league
    ? await prisma.team.findMany({
        where: { leagues: { some: { id: league.id } } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : []
  const teams =
    leagueTeams.length > 0
      ? leagueTeams
      : await prisma.team.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })

  const baseUrl = "/admin/matches"

  return (
    <main className="max-w-4xl mx-auto pb-12 md:pb-16">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 관리자
        </Link>
      </div>
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
        경기 일정
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        시즌·리그·라운드를 선택한 뒤 경기 일정을 수정하거나 추가·삭제할 수 있습니다. 시즌/리그/라운드 추가는 관리자 메뉴의 「시즌·리그·라운드 관리」에서 하세요.
      </p>

      {seasons.length > 0 && (
        <AdminMatchScheduleForm
          seasons={seasons}
          leagues={leagues}
          rounds={rounds}
          currentYear={season?.year ?? 0}
          currentLeagueSlug={league?.slug ?? ""}
          currentRoundSlug={round?.slug ?? ""}
          baseUrl={baseUrl}
        />
      )}

      {seasons.length === 0 && (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          위에서 시즌(연도)을 추가한 뒤, 리그와 라운드를 순서대로 추가할 수 있습니다.
        </p>
      )}

      {round && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-mono text-sm font-bold uppercase text-muted-foreground">
              {season!.year} {league!.name} · {round.slug}
            </h3>
            <RoundFocusToggle roundId={round.id} isFocus={round.isFocus} />
          </div>
          <AdminMatchList
            matches={matches}
            seasonYear={season!.year}
            leagueSlug={league!.slug}
            roundSlug={round.slug}
            roundId={round.id}
            teams={teams}
          />
        </>
      )}
    </main>
  )
}
