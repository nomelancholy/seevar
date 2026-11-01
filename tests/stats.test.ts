import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  NEUTRAL_RATING,
  adjustedRating,
  balancedRating,
  compareBest,
  compareWorst,
  getFanPerspective,
  homeAwayGap,
  isLowSample,
  priorMeanOf,
  ratingDistribution,
  summarizeByPerspective,
  summarizeRatings,
} from "@/lib/utils/stats"

describe("summarizeRatings", () => {
  it("평가가 없으면 평균은 0이 아니라 null", () => {
    assert.deepEqual(summarizeRatings([]), { count: 0, sum: 0, average: null })
  })

  it("평균과 합계를 계산한다", () => {
    const summary = summarizeRatings([5, 4, 3])
    assert.equal(summary.count, 3)
    assert.equal(summary.sum, 12)
    assert.equal(summary.average, 4)
  })

  it("유효하지 않은 값은 건너뛴다", () => {
    assert.equal(summarizeRatings([4, Number.NaN, 2]).count, 2)
  })
})

describe("adjustedRating", () => {
  it("평가가 없으면 null", () => {
    assert.equal(adjustedRating({ count: 0, sum: 0 }, 3, 3), null)
  })

  it("1명이 준 1점이 12명이 준 1.8점보다 낮게 평가되지 않는다", () => {
    const priorMean = 2.9
    const single = adjustedRating(summarizeRatings([1]), priorMean, 3)!
    const consensus = adjustedRating({ count: 12, sum: 1.8 * 12 }, priorMean, 3)!
    assert.ok(consensus < single, `consensus=${consensus} single=${single}`)
  })

  it("평가가 쌓일수록 실제 평균에 수렴한다", () => {
    const few = adjustedRating({ count: 2, sum: 10 }, 3, 3)!
    const many = adjustedRating({ count: 200, sum: 1000 }, 3, 3)!
    assert.ok(few < many)
    assert.ok(Math.abs(many - 5) < 0.05)
  })

  it("가중치 0이면 단순 평균과 같다", () => {
    assert.equal(adjustedRating({ count: 4, sum: 10 }, 3, 0), 2.5)
  })
})

describe("priorMeanOf / isLowSample", () => {
  it("표본이 없으면 중립값을 기준으로 삼는다", () => {
    assert.equal(priorMeanOf([]), NEUTRAL_RATING)
    assert.equal(priorMeanOf([2, 4]), 3)
  })

  it("기준 미만이면 표본 적음", () => {
    assert.equal(isLowSample(2, 3), true)
    assert.equal(isLowSample(3, 3), false)
  })
})

describe("ratingDistribution", () => {
  it("1~5점 버킷에 담고 0.5 단위는 반올림한다", () => {
    assert.deepEqual(ratingDistribution([1, 1, 3, 5, 4.5, 2.4]), [2, 1, 1, 0, 2])
  })

  it("범위를 벗어난 값은 양 끝 버킷으로 모은다", () => {
    assert.deepEqual(ratingDistribution([0, 9]), [1, 0, 0, 0, 1])
  })
})

describe("팬 시점 집계", () => {
  it("응원팀 기준으로 홈/원정/제3자/미설정을 구분한다", () => {
    assert.equal(getFanPerspective("home", "home", "away"), "HOME")
    assert.equal(getFanPerspective("away", "home", "away"), "AWAY")
    assert.equal(getFanPerspective("other", "home", "away"), "NEUTRAL")
    assert.equal(getFanPerspective(null, "home", "away"), "UNKNOWN")
  })

  it("균형 평점은 한쪽 팬 쏠림에 끌려가지 않는다", () => {
    // 진 팀(홈) 팬 9명이 1점, 원정 팬 1명이 5점 → 단순 평균 1.4, 균형 평점 3.0
    const reviews = [
      ...Array.from({ length: 9 }, () => ({ rating: 1, perspective: "HOME" as const })),
      { rating: 5, perspective: "AWAY" as const },
    ]
    const summaries = summarizeByPerspective(reviews)
    assert.equal(summarizeRatings(reviews.map((review) => review.rating)).average, 1.4)
    assert.equal(balancedRating(summaries), 3)
    assert.equal(homeAwayGap(summaries), -4)
  })

  it("한 시점의 평가만 있으면 균형 평점은 null", () => {
    const summaries = summarizeByPerspective([{ rating: 2, perspective: "HOME" }])
    assert.equal(balancedRating(summaries), null)
    assert.equal(homeAwayGap(summaries), null)
  })

  it("응원팀 미설정 평가는 균형 평점에서 제외한다", () => {
    const summaries = summarizeByPerspective([
      { rating: 4, perspective: "HOME" },
      { rating: 2, perspective: "NEUTRAL" },
      { rating: 5, perspective: "UNKNOWN" },
    ])
    assert.equal(balancedRating(summaries), 3)
  })
})

describe("순위 비교", () => {
  const a = { adjusted: 4, count: 3, name: "가" }
  const b = { adjusted: 4, count: 10, name: "나" }
  const c = { adjusted: 2, count: 1, name: "다" }

  it("베스트는 보정 평점이 높은 순, 동점이면 평가 수가 많은 순", () => {
    assert.deepEqual([a, b, c].sort(compareBest).map((item) => item.name), ["나", "가", "다"])
  })

  it("워스트는 보정 평점이 낮은 순, 동점이면 평가 수가 많은 순", () => {
    assert.deepEqual([a, b, c].sort(compareWorst).map((item) => item.name), ["다", "나", "가"])
  })
})
