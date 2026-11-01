/**
 * 팀 상세 URL: /teams/[slug]
 * DB slug의 _ 를 - 로 바꿔 쓴다 (gangwon_fc → gangwon-fc). slug가 없는 팀은 id로 연다.
 */
export function getTeamDetailPath(team: { id: string; slug?: string | null }): string {
  return `/teams/${team.slug ? team.slug.replace(/_/g, "-") : team.id}`
}
