/**
 * 경기 진행 분(숫자) → 카드/목록 표기용 문자열 (period 정보 없을 때 fallback)
 */
export function formatMatchMinuteForDisplay(m: number): string {
  if (m >= 1 && m <= 50) return `전반 ${m}분`
  if (m >= 51 && m <= 95) return `후반 ${m - 45}분`
  if (m >= 96 && m <= 105) return `연장 전반 ${m - 90}분`
  if (m >= 106 && m <= 120) return `연장 후반 ${m - 105}분`
  if (m >= 121) return `연장 후반 ${m - 105}분`
  return `${m}분`
}

const PERIOD_LABEL: Record<string, string> = {
  first: "전반",
  second: "후반",
  et_first: "연장 전반",
  et_second: "연장 후반",
}

/** 서버에 저장된 startPeriod + startMinuteInPeriod → 표기 (90+2는 후반 47분, 연장 전반 2분과 구분) */
export function formatMomentTimeFromPeriod(period: string, minuteInPeriod: number): string {
  const label = PERIOD_LABEL[period] ?? "전반"
  return `${label} ${minuteInPeriod}분`
}
