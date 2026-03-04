const PERIOD_ORDER: Record<string, number> = {
  first: 0,
  second: 1,
  et_first: 2,
  et_second: 3,
}

/** 구간(전반 → 후반 → 연장 전반 → 연장 후반) 우선, 같은 구간 내에서는 분 순. startPeriod 없으면 startMinute로 구간 추정 */
function getSortKey(m: {
  startMinute: number | null
  startPeriod?: string | null
  startMinuteInPeriod?: number | null
}): [number, number] {
  const raw = m.startMinute ?? 9999
  if (m.startPeriod != null && m.startPeriod !== "" && m.startMinuteInPeriod != null) {
    const periodIndex = PERIOD_ORDER[m.startPeriod] ?? 0
    return [periodIndex, m.startMinuteInPeriod]
  }
  if (raw === 9999) return [9999, 9999]
  if (raw <= 50) return [0, raw]
  if (raw <= 90) return [1, raw - 45]
  if (raw <= 105) return [2, raw - 90]
  return [3, raw - 105]
}

/** 구간 우선(전반 < 후반 < 연장 전반 < 연장 후반), 같은 구간 내 분 순, 동일하면 duration 순 */
export function sortMomentsByStartThenDuration<
  T extends {
    startMinute: number | null
    endMinute: number | null
    duration?: number
    startPeriod?: string | null
    startMinuteInPeriod?: number | null
  }
>(moments: T[]): T[] {
  return [...moments].sort((a, b) => {
    const [aPeriod, aMin] = getSortKey(a)
    const [bPeriod, bMin] = getSortKey(b)
    if (aPeriod !== bPeriod) return aPeriod - bPeriod
    if (aMin !== bMin) return aMin - bMin
    const aDur =
      a.duration ??
      (a.startMinute != null && a.endMinute != null ? a.endMinute - a.startMinute : 0)
    const bDur =
      b.duration ??
      (b.startMinute != null && b.endMinute != null ? b.endMinute - b.startMinute : 0)
    return aDur - bDur
  })
}
