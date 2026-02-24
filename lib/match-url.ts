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

export function getMatchMomentsPath(match: MatchForPath): string {
  return `${getMatchDetailPath(match)}/moments`
}
