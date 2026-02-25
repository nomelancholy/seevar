/**
 * 경기 상태: playedAt 기준 자동 도출
 * - 경기 일시 전: SCHEDULED
 * - 경기 일시 ~ 경기 일시 + 3시간: LIVE
 * - 그 이후: FINISHED
 * - DB에 CANCELLED 로 저장된 경우만 CANCELLED 유지
 */

export const LIVE_WINDOW_HOURS = 3
const LIVE_WINDOW_MS = LIVE_WINDOW_HOURS * 60 * 60 * 1000

export type DerivedMatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED"

/**
 * 경기 일시(playedAt)와 기준 시각(asOf)으로 현재 상태를 계산합니다.
 * @param playedAt 경기 일시 (null이면 SCHEDULED)
 * @param options.asOf 기준 시각 (기본: 현재)
 * @param options.storedStatus DB에 저장된 status. CANCELLED이면 그대로 반환
 */
export function deriveMatchStatus(
  playedAt: Date | null,
  options?: { asOf?: Date; storedStatus?: string }
): DerivedMatchStatus {
  const stored = options?.storedStatus
  if (stored === "CANCELLED") return "CANCELLED"

  const now = options?.asOf ? new Date(options.asOf).getTime() : Date.now()
  if (!playedAt) return "SCHEDULED"

  const start = new Date(playedAt).getTime()
  const liveEnd = start + LIVE_WINDOW_MS

  if (now < start) return "SCHEDULED"
  if (now <= liveEnd) return "LIVE"
  return "FINISHED"
}
