import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { RefereeListWithSearch } from "@/components/referees/RefereeListWithSearch"
import { KakaoAdFit } from "@/components/ads/KakaoAdFit"
import {
  SEASON_MIN_VOTES,
  SEASON_PRIOR_WEIGHT,
  adjustedRating,
  isLowSample,
  priorMeanOf,
  summarizeRatings,
} from "@/lib/utils/stats"

export const metadata = {
  title: "심판 정보 | SEE VAR",
  description: "K LEAGUE 심판진의 활동 데이터 및 팬 평점을 확인할 수 있습니다.",
}

export default async function RefereesPage() {
  const referees = await prisma.referee.findMany({
    orderBy: { name: "asc" },
    take: 200,
    include: {
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

  // 정렬용 보정 평점의 기준: 전체 심판 평가의 평균
  const priorMean = priorMeanOf(referees.flatMap((r) => r.reviews.map((review) => review.rating)))

  const list = referees.map((r) => {
    const summary = summarizeRatings(r.reviews.map((review) => review.rating))
    const totalVotes = summary.count
    // 평가가 없으면 0점이 아니라 null("—")
    const averageRating = summary.average
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
      rankScore: adjustedRating(summary, priorMean, SEASON_PRIOR_WEIGHT),
      lowSample: totalVotes > 0 && isLowSample(totalVotes, SEASON_MIN_VOTES),
      totalVotes,
      matchesCount: r._count.matchReferees,
      totalYellowCards,
      totalRedCards,
    }
  })

  return (
    <>
      <KakaoAdFit />
      <main className="py-8 md:py-12">
        <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
          심판 정보
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground max-w-2xl">
          K LEAGUE 심판진의 활동 데이터 및 팬 평점을 확인할 수 있습니다.
        </p>
        <Link
          href="/referees/rankings"
          className="mt-4 inline-flex items-center gap-1.5 border border-border bg-card px-3 md:px-4 py-2 font-mono text-xs md:text-sm font-bold hover:border-primary hover:text-primary transition-colors"
        >
          시즌 심판 랭킹 보기
          <ChevronRight className="size-4" />
        </Link>
      </header>

      <RefereeListWithSearch referees={list} />
      </main>
    </>
  )
}
