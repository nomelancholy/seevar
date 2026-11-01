/**
 * 시즌 누적 심판 랭킹 집계 (순수 함수).
 * 평점 규칙은 lib/utils/stats.ts 참고: 순위는 보정 평점, 화면의 평점은 실제 평균.
 */
import {
  SEASON_MIN_VOTES,
  SEASON_PRIOR_WEIGHT,
  adjustedRating,
  balancedRating,
  compareBest,
  getFanPerspective,
  priorMeanOf,
  summarizeByPerspective,
  summarizeRatings,
} from "@/lib/utils/stats"

export type RankingReviewInput = {
  refereeId: string
  refereeSlug: string
  refereeName: string
  matchId: string
  rating: number
  fanTeamId: string | null
  homeTeamId: string
  awayTeamId: string
}

export type RefereeRankingRow = {
  refereeId: string
  slug: string
  name: string
  /** 평가 수 기준을 채운 심판만 순위를 받는다 */
  rank: number | null
  average: number
  adjusted: number
  voteCount: number
  /** 평가가 달린 경기 수 */
  ratedMatchCount: number
  homeAvg: number | null
  awayAvg: number | null
  neutralAvg: number | null
  balanced: number | null
}

export type RefereeRankings = {
  ranked: RefereeRankingRow[]
  /** 평가 수가 기준 미만이라 순위에서 뺀 심판 (평가 많은 순) */
  unranked: RefereeRankingRow[]
  /** 보정에 쓴 기준 평균 (집계 범위 전체 평가의 평균) */
  priorMean: number
  totalVotes: number
  minVotes: number
}

export function buildRefereeRankings(
  reviews: ReadonlyArray<RankingReviewInput>,
  options: { minVotes?: number; priorWeight?: number } = {}
): RefereeRankings {
  const minVotes = options.minVotes ?? SEASON_MIN_VOTES
  const priorWeight = options.priorWeight ?? SEASON_PRIOR_WEIGHT
  const priorMean = priorMeanOf(reviews.map((review) => review.rating))

  const byReferee = new Map<string, RankingReviewInput[]>()
  for (const review of reviews) {
    const group = byReferee.get(review.refereeId)
    if (group) group.push(review)
    else byReferee.set(review.refereeId, [review])
  }

  const rows: RefereeRankingRow[] = []
  for (const group of byReferee.values()) {
    const first = group[0]
    const summary = summarizeRatings(group.map((review) => review.rating))
    if (summary.average == null) continue
    const perspectives = summarizeByPerspective(
      group.map((review) => ({
        rating: review.rating,
        perspective: getFanPerspective(review.fanTeamId, review.homeTeamId, review.awayTeamId),
      }))
    )
    rows.push({
      refereeId: first.refereeId,
      slug: first.refereeSlug,
      name: first.refereeName,
      rank: null,
      average: summary.average,
      adjusted: adjustedRating(summary, priorMean, priorWeight) ?? summary.average,
      voteCount: summary.count,
      ratedMatchCount: new Set(group.map((review) => review.matchId)).size,
      homeAvg: perspectives.HOME.average,
      awayAvg: perspectives.AWAY.average,
      neutralAvg: perspectives.NEUTRAL.average,
      balanced: balancedRating(perspectives),
    })
  }

  const ranked = rows
    .filter((row) => row.voteCount >= minVotes)
    .sort((a, b) =>
      compareBest(
        { adjusted: a.adjusted, count: a.voteCount, name: a.name },
        { adjusted: b.adjusted, count: b.voteCount, name: b.name }
      )
    )
    .map((row, index) => ({ ...row, rank: index + 1 }))
  const unranked = rows
    .filter((row) => row.voteCount < minVotes)
    .sort((a, b) => b.voteCount - a.voteCount || a.name.localeCompare(b.name, "ko"))

  return { ranked, unranked, priorMean, totalVotes: reviews.length, minVotes }
}
