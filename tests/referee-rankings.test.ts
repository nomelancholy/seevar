import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildRefereeRankings, type RankingReviewInput } from "@/lib/services/referee-rankings"

function reviews(
  refereeId: string,
  ratings: number[],
  overrides: Partial<RankingReviewInput> = {}
): RankingReviewInput[] {
  return ratings.map((rating, index) => ({
    refereeId,
    refereeSlug: refereeId,
    refereeName: refereeId,
    matchId: `${refereeId}-match-${index % 3}`,
    rating,
    fanTeamId: null,
    homeTeamId: "home",
    awayTeamId: "away",
    ...overrides,
  }))
}

describe("buildRefereeRankings", () => {
  it("평가 수 기준을 채운 심판만 순위에 넣는다", () => {
    const result = buildRefereeRankings(
      [...reviews("many", Array(12).fill(4)), ...reviews("few", [5, 5])],
      { minVotes: 10 }
    )
    assert.deepEqual(result.ranked.map((row) => [row.refereeId, row.rank]), [["many", 1]])
    assert.deepEqual(result.unranked.map((row) => [row.refereeId, row.rank]), [["few", null]])
    assert.equal(result.totalVotes, 14)
  })

  it("순위는 보정 평점 기준이고 화면용 평균은 그대로 둔다", () => {
    const result = buildRefereeRankings(
      [
        ...reviews("steady", Array(60).fill(4)),
        ...reviews("lucky", Array(10).fill(5)),
        ...reviews("low", Array(30).fill(2)),
      ],
      { minVotes: 10, priorWeight: 10 }
    )
    // 기준 평균 3.5: lucky = (35+50)/20 = 4.25, steady = (35+240)/70 ≈ 3.93
    assert.deepEqual(result.ranked.map((row) => row.refereeId), ["lucky", "steady", "low"])
    assert.equal(result.ranked[0].average, 5)
    assert.ok(result.ranked[0].adjusted < 5)
    assert.ok(Math.abs(result.priorMean - 3.5) < 1e-9)
  })

  it("평가가 적은 고평점이 꾸준한 고평점을 앞지르지 못한다", () => {
    const result = buildRefereeRankings(
      [
        ...reviews("steady", Array(100).fill(4.5)),
        ...reviews("short", Array(10).fill(4.6)),
        ...reviews("rest", Array(100).fill(2.5)),
      ],
      { minVotes: 10, priorWeight: 10 }
    )
    assert.equal(result.ranked[0].refereeId, "steady")
  })

  it("팬 시점별 평균과 균형 평점, 평가 경기 수를 낸다", () => {
    const result = buildRefereeRankings(
      [
        ...reviews("ref", [1, 1, 1, 1], { fanTeamId: "home" }),
        ...reviews("ref", [5], { fanTeamId: "away", matchId: "another" }),
      ],
      { minVotes: 1 }
    )
    const [row] = result.ranked
    assert.equal(row.homeAvg, 1)
    assert.equal(row.awayAvg, 5)
    assert.equal(row.neutralAvg, null)
    assert.equal(row.balanced, 3)
    assert.equal(row.ratedMatchCount, 4)
  })

  it("평가가 없으면 빈 결과", () => {
    const result = buildRefereeRankings([])
    assert.deepEqual(result.ranked, [])
    assert.deepEqual(result.unranked, [])
    assert.equal(result.totalVotes, 0)
  })
})
