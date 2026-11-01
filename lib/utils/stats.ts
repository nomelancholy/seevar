/**
 * 심판 평점 집계 규칙 (단일 출처).
 * 화면마다 따로 계산하면 기준이 어긋나므로 평균·순위·팬 시점 집계는 모두 여기서 가져다 쓴다.
 *
 * - 평균: 노출(VISIBLE) 평가의 단순 평균. 화면에 보이는 "평점"은 항상 이 값이다.
 * - 보정 평점: 순위를 매길 때만 쓰는 값. 평가 수가 적을수록 기준 평균 쪽으로 당겨서
 *   1명이 준 1점이 12명이 준 1.8점보다 "더 나쁜 심판"이 되지 않게 한다.
 * - 균형 평점: 홈팀 팬·원정팀 팬·제3자 팬 평균을 같은 비중으로 합친 값.
 *   한쪽 팬이 몰려서 평가한 경기의 쏠림을 걸러서 볼 때 쓴다.
 */

/** 기준 평균을 구할 표본이 없을 때 쓰는 중립값 (1~5점의 중앙) */
export const NEUTRAL_RATING = 3

/** 라운드(경기) 단위: 이 수 미만이면 "표본 적음" */
export const ROUND_MIN_VOTES = 3
/** 라운드(경기) 단위 보정 강도: 기준 평균에 주는 가상의 평가 수 */
export const ROUND_PRIOR_WEIGHT = 3

/** 시즌 누적 단위: 이 수 미만이면 "표본 적음" (순위표에서는 순위 제외) */
export const SEASON_MIN_VOTES = 10
/** 시즌 누적 단위 보정 강도 */
export const SEASON_PRIOR_WEIGHT = 10

/** 한 팀 팬이 한 심판에게 준 평가 단위(팀 페이지의 심판 상성) */
export const TEAM_MIN_VOTES = 5
export const TEAM_PRIOR_WEIGHT = 5

export type FanPerspective = "HOME" | "AWAY" | "NEUTRAL" | "UNKNOWN"

/** 균형 평점에 쓰는 시점. 응원팀이 없는 평가(UNKNOWN)는 분류할 수 없어 제외한다. */
export const BALANCED_PERSPECTIVES = ["HOME", "AWAY", "NEUTRAL"] as const

export const FAN_PERSPECTIVE_LABEL: Record<FanPerspective, string> = {
  HOME: "홈팀 팬",
  AWAY: "원정팀 팬",
  NEUTRAL: "제3자 팬",
  UNKNOWN: "응원팀 미설정",
}

/** 평가 작성 시점의 응원팀이 그 경기에서 어느 쪽이었는지 */
export function getFanPerspective(
  fanTeamId: string | null | undefined,
  homeTeamId: string,
  awayTeamId: string
): FanPerspective {
  if (!fanTeamId) return "UNKNOWN"
  if (fanTeamId === homeTeamId) return "HOME"
  if (fanTeamId === awayTeamId) return "AWAY"
  return "NEUTRAL"
}

export type RatingSummary = {
  count: number
  sum: number
  /** 평가가 없으면 null (0점으로 표시하지 않는다) */
  average: number | null
}

export function summarizeRatings(ratings: readonly number[]): RatingSummary {
  let count = 0
  let sum = 0
  for (const rating of ratings) {
    if (!Number.isFinite(rating)) continue
    count += 1
    sum += rating
  }
  return { count, sum, average: count > 0 ? sum / count : null }
}

/**
 * 보정 평점 = (기준 평균 × 가중치 + 평점 합) / (가중치 + 평가 수).
 * 평가가 쌓일수록 실제 평균에 가까워지고, 평가가 없으면 null.
 */
export function adjustedRating(
  summary: Pick<RatingSummary, "count" | "sum">,
  priorMean: number,
  priorWeight: number
): number | null {
  if (summary.count <= 0) return null
  const weight = Math.max(0, priorWeight)
  return (priorMean * weight + summary.sum) / (weight + summary.count)
}

/** 보정의 기준 평균: 같은 범위(라운드·역할, 시즌·역할 등) 전체 평가의 평균 */
export function priorMeanOf(ratings: readonly number[]): number {
  return summarizeRatings(ratings).average ?? NEUTRAL_RATING
}

export function isLowSample(count: number, minVotes: number): boolean {
  return count < minVotes
}

/** 1~5점 분포. 인덱스 0 = 1점 … 인덱스 4 = 5점. 과거 0.5 단위 평점은 반올림해 담는다. */
export function ratingDistribution(ratings: readonly number[]): [number, number, number, number, number] {
  const buckets: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  for (const rating of ratings) {
    if (!Number.isFinite(rating)) continue
    const star = Math.min(5, Math.max(1, Math.round(rating)))
    buckets[star - 1] += 1
  }
  return buckets
}

export type PerspectiveSummaries = Record<FanPerspective, RatingSummary>

export function summarizeByPerspective(
  reviews: ReadonlyArray<{ rating: number; perspective: FanPerspective }>
): PerspectiveSummaries {
  const grouped: Record<FanPerspective, number[]> = { HOME: [], AWAY: [], NEUTRAL: [], UNKNOWN: [] }
  for (const review of reviews) grouped[review.perspective].push(review.rating)
  return {
    HOME: summarizeRatings(grouped.HOME),
    AWAY: summarizeRatings(grouped.AWAY),
    NEUTRAL: summarizeRatings(grouped.NEUTRAL),
    UNKNOWN: summarizeRatings(grouped.UNKNOWN),
  }
}

/**
 * 균형 평점: 평가가 있는 시점(홈/원정/제3자)의 평균을 같은 비중으로 평균.
 * 한 시점의 평가만 있으면 균형을 잡을 상대가 없으므로 null.
 */
export function balancedRating(summaries: PerspectiveSummaries): number | null {
  const averages: number[] = []
  for (const perspective of BALANCED_PERSPECTIVES) {
    const average = summaries[perspective].average
    if (average != null) averages.push(average)
  }
  if (averages.length < 2) return null
  return averages.reduce((total, value) => total + value, 0) / averages.length
}

/** 홈팀 팬 평균 − 원정팀 팬 평균. 양수면 홈팀 팬이 더 후하게 봤다는 뜻. 한쪽이 없으면 null */
export function homeAwayGap(summaries: PerspectiveSummaries): number | null {
  const home = summaries.HOME.average
  const away = summaries.AWAY.average
  if (home == null || away == null) return null
  return home - away
}

type Rankable = { adjusted: number; count: number; name: string }

/** 높은 보정 평점 우선. 같으면 평가 수가 많은 쪽, 그다음 이름순(결과가 흔들리지 않게). */
export function compareBest(a: Rankable, b: Rankable): number {
  const diff = b.adjusted - a.adjusted
  if (Math.abs(diff) > 1e-9) return diff
  if (a.count !== b.count) return b.count - a.count
  return a.name.localeCompare(b.name, "ko")
}

/** 낮은 보정 평점 우선. 같으면 평가 수가 많은 쪽, 그다음 이름순. */
export function compareWorst(a: Rankable, b: Rankable): number {
  const diff = a.adjusted - b.adjusted
  if (Math.abs(diff) > 1e-9) return diff
  if (a.count !== b.count) return b.count - a.count
  return a.name.localeCompare(b.name, "ko")
}

/** 화면 표기: 평가가 없으면 0.0이 아니라 "—" */
export function formatRating(value: number | null | undefined, digits = 1): string {
  return value != null ? value.toFixed(digits) : "—"
}
