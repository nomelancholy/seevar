import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DECISION_CATEGORIES,
  getDecisionCategory,
  normalizeDecisionCategory,
} from "@/lib/decision-categories"

describe("판정 유형", () => {
  it("key는 서로 겹치지 않는다", () => {
    const keys = DECISION_CATEGORIES.map((category) => category.key)
    assert.equal(new Set(keys).size, keys.length)
  })

  it("목록에 있는 key만 저장한다", () => {
    assert.equal(normalizeDecisionCategory("OFFSIDE"), "OFFSIDE")
    assert.equal(normalizeDecisionCategory(" HANDBALL "), "HANDBALL")
    assert.equal(normalizeDecisionCategory("offside"), null)
    assert.equal(normalizeDecisionCategory("<script>"), null)
    assert.equal(normalizeDecisionCategory(""), null)
    assert.equal(normalizeDecisionCategory(null), null)
    assert.equal(normalizeDecisionCategory(undefined), null)
  })

  it("미분류·알 수 없는 값은 표시 정보가 없다", () => {
    assert.equal(getDecisionCategory(null), null)
    assert.equal(getDecisionCategory("REMOVED_LATER"), null)
    assert.equal(getDecisionCategory("PENALTY")?.label, "페널티킥")
  })

  it("규정 링크는 IFAB 경기규칙 페이지를 가리킨다", () => {
    for (const category of DECISION_CATEGORIES) {
      if (category.lawUrl == null) {
        assert.equal(category.law, null)
        continue
      }
      assert.match(category.lawUrl, /^https:\/\/www\.theifab\.com\/laws\/latest\/[a-z-]+\/$/)
    }
  })
})
