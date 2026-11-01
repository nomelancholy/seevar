/**
 * 판정 유형: 쟁점 순간(모멘트)이 어떤 판정에 대한 이의인지 IFAB 경기규칙 기준으로 분류한다.
 * - 작성할 때 고르는 선택 항목이고, Moment.category에 key 문자열로 저장한다.
 * - 이 기능 이전에 만들어진 모멘트는 null(미분류)이다.
 * - 항목을 추가·이름 변경하는 것은 자유지만, 이미 저장된 key는 지우지 말 것.
 */

const IFAB_LAWS_BASE = "https://www.theifab.com/laws/latest"

export type DecisionCategory = {
  key: string
  label: string
  /** 관련 IFAB 경기규칙 조항 (대한축구협회 번역 명칭) */
  law: string | null
  lawUrl: string | null
}

export const DECISION_CATEGORIES = [
  {
    key: "PENALTY",
    label: "페널티킥",
    law: "제14조 페널티킥",
    lawUrl: `${IFAB_LAWS_BASE}/the-penalty-kick/`,
  },
  {
    key: "HANDBALL",
    label: "핸드볼",
    law: "제12조 파울과 불법행위",
    lawUrl: `${IFAB_LAWS_BASE}/fouls-and-misconduct/`,
  },
  {
    key: "OFFSIDE",
    label: "오프사이드",
    law: "제11조 오프사이드",
    lawUrl: `${IFAB_LAWS_BASE}/offside/`,
  },
  {
    key: "CARD",
    label: "경고·퇴장",
    law: "제12조 파울과 불법행위",
    lawUrl: `${IFAB_LAWS_BASE}/fouls-and-misconduct/`,
  },
  {
    key: "FOUL",
    label: "파울 여부",
    law: "제12조 파울과 불법행위",
    lawUrl: `${IFAB_LAWS_BASE}/fouls-and-misconduct/`,
  },
  {
    key: "GOAL",
    label: "득점 인정·취소",
    law: "제10조 경기 결과의 결정",
    lawUrl: `${IFAB_LAWS_BASE}/determining-the-outcome-of-a-match/`,
  },
  {
    key: "VAR",
    label: "VAR 판독",
    law: "VAR 프로토콜",
    lawUrl: `${IFAB_LAWS_BASE}/video-assistant-referee-var-protocol/`,
  },
  {
    key: "GAME_MANAGEMENT",
    label: "경기 운영·추가시간",
    law: "제5조 주심 · 제7조 경기 시간",
    lawUrl: `${IFAB_LAWS_BASE}/the-referee/`,
  },
  { key: "OTHER", label: "기타", law: null, lawUrl: null },
] as const satisfies readonly DecisionCategory[]

export type DecisionCategoryKey = (typeof DECISION_CATEGORIES)[number]["key"]

const CATEGORY_BY_KEY = new Map<string, DecisionCategory>(
  DECISION_CATEGORIES.map((category) => [category.key, category])
)

/** 저장된 key → 표시 정보. 미분류(null)이거나 알 수 없는 값이면 null */
export function getDecisionCategory(key: string | null | undefined): DecisionCategory | null {
  if (!key) return null
  return CATEGORY_BY_KEY.get(key) ?? null
}

/** 입력값 검증: 목록에 있는 key만 저장한다 */
export function normalizeDecisionCategory(key: string | null | undefined): DecisionCategoryKey | null {
  const category = getDecisionCategory(key?.trim())
  return category ? (category.key as DecisionCategoryKey) : null
}
