/** startMinute 오름차순, 같은 경우 duration(구간 길이) 오름차순. duration 없으면 endMinute - startMinute 로 계산 */
export function sortMomentsByStartThenDuration<
  T extends { startMinute: number | null; endMinute: number | null; duration?: number }
>(moments: T[]): T[] {
  return [...moments].sort((a, b) => {
    const aStart = a.startMinute ?? 9999
    const bStart = b.startMinute ?? 9999
    if (aStart !== bStart) return aStart - bStart
    const aDur =
      a.duration ??
      (a.startMinute != null && a.endMinute != null ? a.endMinute - a.startMinute : 0)
    const bDur =
      b.duration ??
      (b.startMinute != null && b.endMinute != null ? b.endMinute - b.startMinute : 0)
    return aDur - bDur
  })
}
