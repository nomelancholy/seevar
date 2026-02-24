import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: "MATCH CENTER | See VAR",
  description: "시즌별, 라운드별 경기 일정 및 VAR 판정 데이터",
}

/** /matches → /matches/[year]/[leagueSlug]/[roundSlug] 로 리다이렉트 (slug 기반 URL) */
export default async function MatchesIndexPage() {
  const season = await prisma.season.findFirst({
    orderBy: { year: "desc" },
  })
  if (!season) {
    redirect("/matches/archive/2026/kleague1/round-1")
  }

  const league = await prisma.league.findFirst({
    where: { seasonId: season.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderBy: { slug: "asc" } as any,
  })
  if (!league) {
    redirect(`/matches/archive/${season.year}/kleague1/round-1`)
  }

  const round = await prisma.round.findFirst({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { leagueId: league.id, isFocus: false } as any,
    orderBy: { number: "asc" },
  })
  if (!round) {
    redirect(`/matches/archive/${season.year}/${(league as unknown as { slug: string }).slug}/round-1`)
  }

  redirect(`/matches/archive/${season.year}/${(league as unknown as { slug: string }).slug}/${(round as unknown as { slug: string }).slug}`)
}
