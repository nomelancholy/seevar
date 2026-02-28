import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminMatchScheduleForm } from "../matches/AdminMatchScheduleForm"
import { AdminRefereeAssignmentList } from "./AdminRefereeAssignmentList"
import { AdminBulkRefereeAssignmentUpload } from "./AdminBulkRefereeAssignmentUpload"

export const metadata = {
  title: "심판 배정 정보 | 관리자 | See VAR",
  description: "경기별 심판 배정 추가·수정·삭제, JSON 일괄 업로드",
}

type SearchParams = Promise<{ year?: string; league?: string; round?: string }>

export default async function AdminRefereeAssignmentsPage({
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
    redirect(`/admin/referee-assignments?year=${season.year}&league=${leagues[0].slug}`)
  }

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
  const round = rounds.find((r) => r.slug === roundSlugRes) ?? rounds[0] ?? null
  if (league && rounds.length > 0 && !round) {
    redirect(
      `/admin/referee-assignments?year=${season!.year}&league=${league.slug}&round=${rounds[0].slug}`
    )
  }

  let matches: Awaited<
    ReturnType<
      typeof prisma.match.findMany<{
        include: {
          homeTeam: true
          awayTeam: true
          matchReferees: { include: { referee: true } }
        }
      }>
    >
  > = []
  if (round) {
    matches = await prisma.match.findMany({
      where: { roundId: round.id },
      orderBy: [{ roundOrder: "asc" }],
      include: {
        homeTeam: true,
        awayTeam: true,
        matchReferees: { include: { referee: true }, orderBy: { role: "asc" } },
      },
    })
  }

  const allReferees = await prisma.referee.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  })

  const baseUrl = "/admin/referee-assignments"

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
        심판 배정 정보
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        시즌·리그·라운드를 선택한 뒤 경기별로 역할당 심판을 배정할 수 있습니다. JSON 파일로 일괄 추가도 가능합니다. 배정 시 RefereeStats·RefereeTeamStat에 자동 반영됩니다.
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

      <AdminBulkRefereeAssignmentUpload />

      {round && (
        <AdminRefereeAssignmentList
          matches={matches}
          seasonYear={season!.year}
          leagueName={league!.name}
          roundSlug={round.slug}
          allReferees={allReferees}
        />
      )}
    </main>
  )
}
