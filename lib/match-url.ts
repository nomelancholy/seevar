/**
 * 경기 상세 URL: /matches/game/[year]/[leagueSlug]/[roundSlug]/[matchNumber]
 * (game 구간으로 [id]와 동적 세그먼트 충돌 방지)
 * matchNumber = 라운드 내 1-based 순서 (roundOrder)
 */
export type MatchForPath = {
  roundOrder: number
  round: { slug: string; league: { slug: string; season: { year: number } } }
}

export function getMatchDetailPath(match: MatchForPath): string {
  const year = match.round.league.season.year
  const leagueSlug = match.round.league.slug
  const roundSlug = match.round.slug
  return `/matches/game/${year}/${leagueSlug}/${roundSlug}/${match.roundOrder}`
}

/** 경기 상세 링크 + 이전 페이지로 돌아가기용 back 쿼리 (진입 경로별 뒤로가기용) */
export function getMatchDetailPathWithBack(match: MatchForPath, backPath: string): string {
  const path = getMatchDetailPath(match)
  const safe = backPath.startsWith("/") && !backPath.includes("//") ? backPath : "/matches"
  return `${path}?back=${encodeURIComponent(safe)}`
}
