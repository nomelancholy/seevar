import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildRoundRefereeHighlights,
  type RoundReviewInput,
} from "@/lib/services/round-referee-highlights"

type Feedback = { id: string; likeCount: number }

let seq = 0
function review(
  overrides: Partial<RoundReviewInput<Feedback>> & { refereeId: string; rating: number }
): RoundReviewInput<Feedback> {
  seq += 1
  const matchId = overrides.matchId ?? `match-${overrides.refereeId}`
  return {
    refereeSlug: overrides.refereeId,
    refereeName: overrides.refereeId,
    role: "MAIN",
    matchId,
    fanTeamId: null,
    homeTeamId: "home",
    awayTeamId: "away",
    matchForDisplay: { homeName: "홈", awayName: "원정", matchPath: `/matches/${matchId}` },
    feedback: { id: `fb-${seq}`, likeCount: 0 },
    ...overrides,
  }
}

function repeat(count: number, make: () => RoundReviewInput<Feedback>) {
  return Array.from({ length: count }, make)
}

describe("buildRoundRefereeHighlights", () => {
  it("평가가 없으면 빈 결과", () => {
    const result = buildRoundRefereeHighlights<Feedback>([])
    assert.deepEqual(result, { bestByRole: {}, worstByRole: {}, allRoundReferees: [] })
  })

  it("1명이 준 1점보다 다수가 준 낮은 평점을 워스트로 뽑는다", () => {
    const result = buildRoundRefereeHighlights([
      ...repeat(12, () => review({ refereeId: "consensus", rating: 2 })),
      review({ refereeId: "single", rating: 1 }),
      ...repeat(6, () => review({ refereeId: "good", rating: 5 })),
    ])
    assert.equal(result.worstByRole.MAIN?.refereeId, "consensus")
    assert.equal(result.bestByRole.MAIN?.refereeId, "good")
    // 화면에 보이는 평점은 보정값이 아니라 실제 평균
    assert.equal(result.worstByRole.MAIN?.avg, 2)
    assert.equal(result.worstByRole.MAIN?.lowSample, false)
    const single = result.allRoundReferees.find((stat) => stat.id === "single")
    assert.equal(single?.lowSample, true)
    assert.equal(single?.avg, 1)
  })

  it("평가받은 심판이 한 명뿐이면 베스트·워스트 양쪽에 올리지 않는다", () => {
    const high = buildRoundRefereeHighlights(repeat(4, () => review({ refereeId: "only", rating: 4 })))
    assert.equal(high.bestByRole.MAIN?.refereeId, "only")
    assert.equal(high.worstByRole.MAIN, undefined)

    const low = buildRoundRefereeHighlights(repeat(4, () => review({ refereeId: "only", rating: 2 })))
    assert.equal(low.bestByRole.MAIN, undefined)
    assert.equal(low.worstByRole.MAIN?.refereeId, "only")
  })

  it("전원 동점이면 한 명을 임의로 워스트로 지목하지 않는다", () => {
    const result = buildRoundRefereeHighlights([
      review({ refereeId: "a", rating: 4 }),
      review({ refereeId: "b", rating: 4 }),
    ])
    assert.ok(result.bestByRole.MAIN)
    assert.equal(result.worstByRole.MAIN, undefined)
  })

  it("같은 경기에서 함께 평가받은 VAR 2명은 한 카드로 묶고, 워스트 후보에서 뺀다", () => {
    const result = buildRoundRefereeHighlights([
      ...repeat(3, () => review({ refereeId: "var-a", role: "VAR", matchId: "m1", rating: 5 })),
      ...repeat(3, () => review({ refereeId: "var-b", role: "VAR", matchId: "m1", rating: 5 })),
      ...repeat(3, () => review({ refereeId: "var-c", role: "VAR", matchId: "m2", rating: 2 })),
    ])
    const best = result.bestByRole.VAR
    assert.ok(best)
    assert.deepEqual(
      [best.refereeId, ...(best.peerRefs ?? []).map((peer) => peer.slug)].sort(),
      ["var-a", "var-b"]
    )
    assert.equal(result.worstByRole.VAR?.refereeId, "var-c")
  })

  it("한 라운드에 두 경기를 맡은 심판은 경기별로 따로 집계한다", () => {
    const result = buildRoundRefereeHighlights([
      ...repeat(3, () => review({ refereeId: "busy", matchId: "m1", rating: 5 })),
      ...repeat(3, () => review({ refereeId: "busy", matchId: "m2", rating: 1 })),
    ])
    assert.equal(result.allRoundReferees.length, 2)
    assert.equal(result.bestByRole.MAIN?.matchForDisplay?.matchPath, "/matches/m1")
    assert.equal(result.worstByRole.MAIN?.matchForDisplay?.matchPath, "/matches/m2")
  })

  it("홈·원정·제3자 팬 평균을 따로 낸다", () => {
    const result = buildRoundRefereeHighlights([
      review({ refereeId: "ref", rating: 5, fanTeamId: "home" }),
      review({ refereeId: "ref", rating: 1, fanTeamId: "away" }),
      review({ refereeId: "ref", rating: 3, fanTeamId: "third" }),
      review({ refereeId: "ref", rating: 4, fanTeamId: null }),
    ])
    const [stat] = result.allRoundReferees
    assert.equal(stat.homeAvg, 5)
    assert.equal(stat.awayAvg, 1)
    assert.equal(stat.neutralAvg, 3)
    assert.equal(stat.voteCount, 4)
  })

  it("한줄평은 좋아요 순 상위 3개만, 별점만 준 평가는 제외한다", () => {
    const result = buildRoundRefereeHighlights([
      review({ refereeId: "ref", rating: 4, feedback: { id: "low", likeCount: 1 } }),
      review({ refereeId: "ref", rating: 4, feedback: { id: "top", likeCount: 9 } }),
      review({ refereeId: "ref", rating: 4, feedback: null }),
      review({ refereeId: "ref", rating: 4, feedback: { id: "mid", likeCount: 5 } }),
      review({ refereeId: "ref", rating: 4, feedback: { id: "none", likeCount: 0 } }),
    ])
    assert.deepEqual(
      result.bestByRole.MAIN?.reviews.map((feedback) => feedback.id),
      ["top", "mid", "low"]
    )
    assert.equal(result.bestByRole.MAIN?.voteCount, 5)
  })

  it("전체 목록은 보정 평점이 높은 순", () => {
    const result = buildRoundRefereeHighlights([
      review({ refereeId: "one-five", rating: 5 }),
      ...repeat(10, () => review({ refereeId: "ten-four-half", rating: 4.5 })),
      ...repeat(10, () => review({ refereeId: "ten-two", rating: 2 })),
    ])
    assert.deepEqual(
      result.allRoundReferees.map((stat) => stat.id),
      ["ten-four-half", "one-five", "ten-two"]
    )
  })
})
