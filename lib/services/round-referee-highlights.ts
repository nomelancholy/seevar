/**
 * 라운드 베스트/워스트 심판 집계.
 * 홈(포커스 라운드)과 경기 기록(아카이브)이 같은 규칙을 쓰도록 순수 함수로 분리했다.
 * 평점 규칙 자체는 lib/utils/stats.ts 참고.
 */
import {
  ROUND_MIN_VOTES,
  ROUND_PRIOR_WEIGHT,
  NEUTRAL_RATING,
  adjustedRating,
  compareBest,
  compareWorst,
  getFanPerspective,
  isLowSample,
  priorMeanOf,
  summarizeByPerspective,
  summarizeRatings,
} from "@/lib/utils/stats"

export const ROLES_FOR_BEST_WORST = ["MAIN", "VAR", "ASSISTANT", "WAITING"] as const

/** 카드에 노출할 한줄평 최대 개수 (좋아요 순) */
const FEEDBACKS_PER_CARD = 3

export type RoundMatchForDisplay = {
  homeName: string
  awayName: string
  matchPath: string
  homeEmblemPath?: string | null
  awayEmblemPath?: string | null
}

export type RoundReviewInput<TFeedback extends { likeCount: number }> = {
  refereeId: string
  refereeSlug: string
  refereeName: string
  role: string
  matchId: string
  rating: number
  /** 작성 시점 응원팀 스냅샷 */
  fanTeamId: string | null
  homeTeamId: string
  awayTeamId: string
  matchForDisplay: RoundMatchForDisplay
  /** 한줄평을 남긴 평가만. 별점만 준 평가는 null */
  feedback: TFeedback | null
}

/** 한 경기에서 한 역할로 뛴 심판 한 명의 라운드 평점 */
export type RoundRefereeStat = {
  id: string
  slug: string
  name: string
  role: string
  matchId: string
  avg: number
  voteCount: number
  /** 순위용 보정 평점 (화면의 평점은 avg) */
  adjusted: number
  /** 평가 수가 ROUND_MIN_VOTES 미만 */
  lowSample: boolean
  matchForDisplay?: RoundMatchForDisplay
  homeAvg?: number
  awayAvg?: number
  neutralAvg?: number
}

export type RoundRefereeCard<TFeedback> = {
  refereeId: string
  slug: string
  name: string
  role: string
  avg: number
  voteCount: number
  lowSample: boolean
  /** 같은 경기·같은 역할·동일 평점인 다른 심판 (이름, 슬러그) */
  peerRefs?: { name: string; slug: string }[]
  matchForDisplay?: RoundMatchForDisplay
  reviews: TFeedback[]
}

export type RoundRefereeHighlights<TFeedback> = {
  bestByRole: Partial<Record<string, RoundRefereeCard<TFeedback>>>
  worstByRole: Partial<Record<string, RoundRefereeCard<TFeedback>>>
  /** 보정 평점 높은 순 */
  allRoundReferees: RoundRefereeStat[]
}

type StatWithFeedbacks<TFeedback> = RoundRefereeStat & { feedbacks: TFeedback[] }

/** VAR 2명처럼 한 경기에서 같은 평가를 함께 받은 심판은 한 카드로 묶는다 */
function isPeer(a: RoundRefereeStat, b: RoundRefereeStat): boolean {
  return (
    a.id !== b.id &&
    a.matchId === b.matchId &&
    a.voteCount === b.voteCount &&
    Math.abs(a.avg - b.avg) < 1e-6
  )
}

function toCard<TFeedback>(
  stat: StatWithFeedbacks<TFeedback>,
  sameRole: StatWithFeedbacks<TFeedback>[]
): RoundRefereeCard<TFeedback> {
  const peers = sameRole.filter((other) => isPeer(stat, other))
  return {
    refereeId: stat.id,
    slug: stat.slug,
    name: stat.name,
    role: stat.role,
    avg: stat.avg,
    voteCount: stat.voteCount,
    lowSample: stat.lowSample,
    peerRefs: peers.length > 0 ? peers.map((peer) => ({ name: peer.name, slug: peer.slug })) : undefined,
    matchForDisplay: stat.matchForDisplay,
    reviews: stat.feedbacks,
  }
}

export function buildRoundRefereeHighlights<TFeedback extends { likeCount: number }>(
  reviews: ReadonlyArray<RoundReviewInput<TFeedback>>
): RoundRefereeHighlights<TFeedback> {
  // 평점은 경기 단위 퍼포먼스이므로 같은 라운드에 두 경기를 맡은 심판은 경기별로 따로 집계한다
  const groups = new Map<string, RoundReviewInput<TFeedback>[]>()
  const ratingsByRole = new Map<string, number[]>()
  for (const review of reviews) {
    const key = `${review.matchId}:${review.refereeId}:${review.role}`
    const group = groups.get(key)
    if (group) group.push(review)
    else groups.set(key, [review])

    const roleRatings = ratingsByRole.get(review.role)
    if (roleRatings) roleRatings.push(review.rating)
    else ratingsByRole.set(review.role, [review.rating])
  }

  const stats: StatWithFeedbacks<TFeedback>[] = []
  for (const group of groups.values()) {
    const first = group[0]
    const summary = summarizeRatings(group.map((review) => review.rating))
    if (summary.average == null) continue
    const priorMean = priorMeanOf(ratingsByRole.get(first.role) ?? [])
    const perspectives = summarizeByPerspective(
      group.map((review) => ({
        rating: review.rating,
        perspective: getFanPerspective(review.fanTeamId, review.homeTeamId, review.awayTeamId),
      }))
    )
    const feedbacks = group
      .map((review) => review.feedback)
      .filter((feedback): feedback is TFeedback => feedback != null)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, FEEDBACKS_PER_CARD)

    stats.push({
      id: first.refereeId,
      slug: first.refereeSlug,
      name: first.refereeName,
      role: first.role,
      matchId: first.matchId,
      avg: summary.average,
      voteCount: summary.count,
      adjusted: adjustedRating(summary, priorMean, ROUND_PRIOR_WEIGHT) ?? summary.average,
      lowSample: isLowSample(summary.count, ROUND_MIN_VOTES),
      matchForDisplay: first.matchForDisplay,
      homeAvg: perspectives.HOME.average ?? undefined,
      awayAvg: perspectives.AWAY.average ?? undefined,
      neutralAvg: perspectives.NEUTRAL.average ?? undefined,
      feedbacks,
    })
  }

  const rank = (stat: RoundRefereeStat) => ({
    adjusted: stat.adjusted,
    count: stat.voteCount,
    name: stat.name,
  })
  // 평점과 평가 수까지 같으면 한줄평이 있는 심판을 카드에 올린다
  const byComment = (a: StatWithFeedbacks<TFeedback>, b: StatWithFeedbacks<TFeedback>) =>
    Math.abs(a.adjusted - b.adjusted) < 1e-9 && a.voteCount === b.voteCount
      ? Math.min(b.feedbacks.length, 1) - Math.min(a.feedbacks.length, 1)
      : 0

  const bestByRole: RoundRefereeHighlights<TFeedback>["bestByRole"] = {}
  const worstByRole: RoundRefereeHighlights<TFeedback>["worstByRole"] = {}

  for (const role of ROLES_FOR_BEST_WORST) {
    const sameRole = stats.filter((stat) => stat.role === role)
    if (sameRole.length === 0) continue

    const best = [...sameRole].sort((a, b) => byComment(a, b) || compareBest(rank(a), rank(b)))[0]
    // 베스트와 한 카드로 묶이는 심판은 워스트 후보에서 뺀다 (같은 심판이 양쪽에 걸리지 않게)
    const others = sameRole.filter((stat) => stat !== best && !isPeer(best, stat))
    const worst = [...others].sort((a, b) => byComment(a, b) || compareWorst(rank(a), rank(b)))[0]
    const hasSpread = worst != null && Math.abs(best.adjusted - worst.adjusted) > 1e-9

    if (worst && hasSpread) {
      bestByRole[role] = toCard(best, sameRole)
      worstByRole[role] = toCard(worst, sameRole)
    } else if (best.avg >= NEUTRAL_RATING) {
      // 비교 대상이 없거나 전원 동점이면 중립값(3점) 기준으로 한쪽에만 올린다
      bestByRole[role] = toCard(best, sameRole)
    } else {
      worstByRole[role] = toCard(best, sameRole)
    }
  }

  const allRoundReferees = [...stats]
    .sort((a, b) => compareBest(rank(a), rank(b)))
    .map((stat): RoundRefereeStat => ({
      id: stat.id,
      slug: stat.slug,
      name: stat.name,
      role: stat.role,
      matchId: stat.matchId,
      avg: stat.avg,
      voteCount: stat.voteCount,
      adjusted: stat.adjusted,
      lowSample: stat.lowSample,
      matchForDisplay: stat.matchForDisplay,
      homeAvg: stat.homeAvg,
      awayAvg: stat.awayAvg,
      neutralAvg: stat.neutralAvg,
    }))

  return { bestByRole, worstByRole, allRoundReferees }
}
