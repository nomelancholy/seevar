/**
 * 경기 상태
 * - 시작: playedAt 기준 자동 (경기 일시 지나면 SCHEDULED → LIVE)
 * - 종료: 관리자가 공지/관리자에서 상태를 FINISHED로 변경할 때만 종료 (경기마다 종료 시각이 달라서)
 * - CANCELLED: 관리자 설정만
 */

/** 배치/크론의 경기 일정 갱신 윈도우(전후 N시간)용. deriveMatchStatus에서는 종료 시각 자동 계산에 사용하지 않음 */
export const LIVE_WINDOW_HOURS = 3

export type DerivedMatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED"

/**
 * 경기 일시(playedAt)와 DB 저장 상태(storedStatus)로 표시할 상태를 결정합니다.
 * - CANCELLED / FINISHED: DB에 저장된 값만 사용 (관리자 수동 설정)
 * - LIVE: DB에 LIVE이거나, playedAt이 지났으면 자동 LIVE (시작은 playedAt 기준)
 * - SCHEDULED: playedAt 전이면 SCHEDULED. 종료는 자동이 아니므로 FINISHED는 관리자 설정 시에만.
 */
export function deriveMatchStatus(
  playedAt: Date | null,
  options?: { asOf?: Date; storedStatus?: string }
): DerivedMatchStatus {
  const stored = options?.storedStatus
  if (stored === "CANCELLED") return "CANCELLED"
  if (stored === "FINISHED") return "FINISHED"
  if (stored === "LIVE") return "LIVE"

  const now = options?.asOf ? new Date(options.asOf).getTime() : Date.now()
  if (!playedAt) return "SCHEDULED"

  const start = new Date(playedAt).getTime()
  if (now < start) return "SCHEDULED"
  return "LIVE"
}
