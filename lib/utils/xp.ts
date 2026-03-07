/**
 * 유저 경험치(XP) 및 레벨 규칙
 * 상세: docs/XP_AND_LEVEL.md
 *
 * - 주요 활동: 모멘트 생성 50 XP
 * - 일상 활동: 심판 평가 10 XP
 * - 연속성 보너스: 3경기 연속 평가 +20 XP
 * - 베스트 모멘트: 내 모멘트가 추천(SEE VAR)받음 +10 XP
 * - 신고 승인(숨김) 시 XP 차감, 재심 통과 시 복구
 */

/** 모멘트 생성 (주요 활동) — 콘텐츠 생산·커뮤니티 활성화 핵심 */
export const XP_MOMENT_CREATE = 50
/** 심판 평가 (일상 활동) — 간단한 참여형 액션 */
export const XP_REVIEW_CREATE = 10
/** 심판 평가 답글 */
export const XP_REVIEW_REPLY_CREATE = 5
/** 3경기 연속 평가 참여 보너스 — 리텐션 강화 */
export const XP_CONTINUITY_BONUS = 20
/** 내가 만든 모멘트가 추천(SEE VAR)받음 — 양질 콘텐츠 유도 */
export const XP_BEST_MOMENT = 10
/** 신고 승인으로 콘텐츠 숨김 시 작성자에게 차감하는 XP. 재노출 시 이만큼 복구 */
export const XP_PENALTY_ON_HIDE = 20

/**
 * 지수 성장형 레벨 곡선
 * 다음 레벨 필요 XP = 현재 레벨 * 100
 * Lv.1: 0~100, Lv.2: 100~300, Lv.3: 300~600, ... Lv.10: 4500~5500
 */
export function xpForLevel(level: number): number {
  const L = Math.max(1, Math.floor(Number(level)))
  return (100 * (L - 1) * L) / 2
}

/** XP → 레벨 (1부터 시작) */
export function getLevelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(Number(xp)))
  if (safe === 0) return 1
  const t = safe / 50
  const L = Math.floor((Math.sqrt(1 + 4 * t) - 1) / 2) + 1
  return Math.max(1, L)
}

/** 현재 레벨에서 다음 레벨까지의 진행률 0~100 (%) */
export function getXpProgressPercent(xp: number): number {
  const safe = Math.max(0, Math.floor(Number(xp)))
  if (!Number.isFinite(safe)) return 0
  const level = getLevelFromXp(safe)
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const need = nextLevelXp - currentLevelXp
  if (need <= 0) return 100
  const have = safe - currentLevelXp
  const pct = Math.round((have / need) * 100)
  return Math.max(0, Math.min(100, pct))
}
