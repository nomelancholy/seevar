import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: "MATCH CENTER | SEE VAR",
  description: "시즌별, 라운드별 경기 일정 및 VAR 판정 데이터",
}

const K1_SLUGS = ["kleague1", "k-league1", "k-league-1"]
const K2_SLUGS = ["kleague2", "k-league2", "k-league-2"]

function isK1(slug: string) {
  return K1_SLUGS.includes(slug.toLowerCase())
}
function isK2(slug: string) {
  return K2_SLUGS.includes(slug.toLowerCase())
}

/** /matches → /matches/[year]/[leagueSlug]/[roundSlug] 로 리다이렉트. 우선순위: K리그1 포커스 → K리그2 포커스 → K리그1 1라운드 */
export default async function MatchesIndexPage() {
  const season = await prisma.season.findFirst({
    orderBy: { year: "desc" },
  })
  if (!season) {
    redirect("/matches/archive/2026/kleague1/round-1")
  }

  const leagues = await prisma.league.findMany({
    where: { seasonId: season.id },
    orderBy: { slug: "asc" },
    select: { id: true, slug: true },
  })
  const k1League = leagues.find((l) => isK1(l.slug))
  const k2League = leagues.find((l) => isK2(l.slug))

  // 1) K리그1 포커스 라운드
  if (k1League) {
    const k1Focus = await prisma.round.findFirst({
      where: { leagueId: k1League.id, isFocus: true },
      select: { slug: true },
    })
    if (k1Focus) {
      redirect(`/matches/archive/${season.year}/${k1League.slug}/${k1Focus.slug}`)
    }
  }

  // 2) K리그2 포커스 라운드
  if (k2League) {
    const k2Focus = await prisma.round.findFirst({
      where: { leagueId: k2League.id, isFocus: true },
      select: { slug: true },
    })
    if (k2Focus) {
      redirect(`/matches/archive/${season.year}/${k2League.slug}/${k2Focus.slug}`)
    }
  }

  // 3) K리그1 1라운드
  if (k1League) {
    const k1Round1 = await prisma.round.findFirst({
      where: { leagueId: k1League.id, number: 1 },
      select: { slug: true },
    })
    if (k1Round1) {
      redirect(`/matches/archive/${season.year}/${k1League.slug}/${k1Round1.slug}`)
    }
  }

  // 4) 폴백: 라운드가 있는 첫 리그의 첫 라운드
  const leagueWithRound = await prisma.league.findFirst({
    where: { seasonId: season.id, rounds: { some: {} } },
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

  const league = leagues[0]
  if (!league) {
    redirect(`/matches/archive/${season.year}/kleague1/round-1`)
  }
  redirect(`/matches/archive/${season.year}/${league.slug}/round-1`)
}
