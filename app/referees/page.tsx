import { prisma } from "@/lib/prisma"
import { RefereeListWithSearch } from "@/components/referees/RefereeListWithSearch"

export const metadata = {
  title: "REFEREE DATABASE | See VAR",
  description: "K LEAGUE 공식 심판진의 활동 데이터 및 팬 평점",
}

export default async function RefereesPage() {
  const referees = await prisma.referee.findMany({
    orderBy: { name: "asc" },
    take: 200,
    include: {
      stats: true,
      _count: { select: { matchReferees: true } },
      matchReferees: {
        select: {
          homeYellowCards: true,
          awayYellowCards: true,
          homeRedCards: true,
          awayRedCards: true,
        },
      },
    },
  })

  const list = referees.map((r) => {
    const totalMatches = r.stats.reduce((sum: number, s: { matchCount: number }) => sum + s.matchCount, 0)
    const weightedSum = r.stats.reduce((sum: number, s: { avgRating: number; matchCount: number }) => sum + s.avgRating * s.matchCount, 0)
    const averageRating =
      totalMatches > 0 ? weightedSum / totalMatches : null
    const totalYellowCards = r.matchReferees.reduce(
      (sum, mr) => sum + mr.homeYellowCards + mr.awayYellowCards,
      0
    )
    const totalRedCards = r.matchReferees.reduce(
      (sum, mr) => sum + mr.homeRedCards + mr.awayRedCards,
      0
    )
    return {
      id: r.id,
      slug: (r as typeof r & { slug: string }).slug,
      name: r.name,
      averageRating,
      matchesCount: r._count.matchReferees,
      totalYellowCards,
      totalRedCards,
    }
  })

  return (
    <main className="py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
          REFEREE DATABASE
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground max-w-2xl">
          K LEAGUE 공식 심판진의 활동 데이터 및 팬 평점을 확인할 수 있는 통합 데이터베이스입니다.
        </p>
      </header>

      <RefereeListWithSearch referees={list} />
    </main>
  )
}
