import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: "MATCH CENTER | See VAR",
  description: "시즌별, 라운드별 경기 일정 및 VAR 판정 데이터",
}

/** /matches → /matches/[year]/[leagueSlug]/[roundSlug] 로 리다이렉트. 라운드가 있는 리그를 우선 선택 */
export default async function MatchesIndexPage() {
  const season = await prisma.season.findFirst({
    orderBy: { year: "desc" },
  })
  if (!season) {
    redirect("/matches/archive/2026/kleague1/round-1")
  }

  const leagueWithRound = await prisma.league.findFirst({
    where: {
      seasonId: season.id,
      rounds: { some: {} },
    },
    orderBy: { slug: "asc" },
    include: {
      rounds: { orderBy: { number: "asc" }, take: 1, select: { slug: true } },
    },
  })
  if (leagueWithRound?.rounds[0]) {
    redirect(
      `/matches/archive/${season.year}/${leagueWithRound.slug}/${leagueWithRound.rounds[0].slug}`,
    )
  }

  const league = await prisma.league.findFirst({
    where: { seasonId: season.id },
    orderBy: { slug: "asc" },
  })
  if (!league) {
    redirect(`/matches/archive/${season.year}/kleague1/round-1`)
  }
  redirect(`/matches/archive/${season.year}/${(league as unknown as { slug: string }).slug}/round-1`)
}
