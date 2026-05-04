import { prisma } from "@/lib/prisma"
import { RefereeListWithSearch } from "@/components/referees/RefereeListWithSearch"
import { KakaoAdFit } from "@/components/ads/KakaoAdFit"

export const metadata = {
  title: "심판 정보 | SEE VAR",
  description: "K LEAGUE 심판진의 활동 데이터 및 팬 평점을 확인할 수 있습니다.",
}

export default async function RefereesPage() {
  const referees = await prisma.referee.findMany({
    orderBy: { name: "asc" },
    take: 200,
    include: {
      stats: true,
      reviews: {
        where: { status: "VISIBLE" },
        select: { rating: true },
      },
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
    const reviews = r.reviews as Array<{ rating: number }>
    const totalVotes = reviews.length
    const averageRatingFromReviews =
      totalVotes > 0 ? reviews.reduce((sum, rev) => sum + rev.rating, 0) / totalVotes : null
    const totalMatches = r.stats.reduce((sum: number, s: { matchCount: number }) => sum + s.matchCount, 0)
    const weightedSum = r.stats.reduce((sum: number, s: { avgRating: number; matchCount: number }) => sum + s.avgRating * s.matchCount, 0)
    const averageRating =
      averageRatingFromReviews ??
      (totalMatches > 0 ? weightedSum / totalMatches : null)
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
      totalVotes,
      matchesCount: r._count.matchReferees,
      totalYellowCards,
      totalRedCards,
    }
  })

  return (
    <main className="py-8 md:py-12">
      <div className="w-full flex justify-center items-center mb-8">
        <KakaoAdFit />
      </div>
      <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
          심판 정보
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground max-w-2xl">
          K LEAGUE 심판진의 활동 데이터 및 팬 평점을 확인할 수 있습니다.
        </p>
      </header>

      <RefereeListWithSearch referees={list} />
    </main>
  )
}
