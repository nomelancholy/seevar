import type { MetadataRoute } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import { getTeamDetailPath } from "@/lib/team-url"
import { SITE_URL } from "@/lib/site"

// 빌드 시 DB에 접속하지 않도록 요청 시점에 생성한다 (배포 이미지 빌드에는 DB가 없다)
export const dynamic = "force-dynamic"

// "/matches"는 진행 중인 라운드로 리다이렉트만 하므로 넣지 않는다 (라운드별 주소가 아래에 들어간다)
const STATIC_PATHS = [
  "/",
  "/about",
  "/notice",
  "/referees",
  "/referees/rankings",
  "/teams",
  "/terms",
  "/privacy",
]

const getSitemapEntries = unstable_cache(
  async () => {
    const [rounds, matches, referees, teams, notices] = await Promise.all([
      prisma.round.findMany({
        where: { matches: { some: {} } },
        select: { slug: true, league: { select: { slug: true, season: { select: { year: true } } } } },
      }),
      prisma.match.findMany({
        select: {
          roundOrder: true,
          updatedAt: true,
          round: { select: { slug: true, league: { select: { slug: true, season: { select: { year: true } } } } } },
        },
      }),
      prisma.referee.findMany({ select: { slug: true } }),
      prisma.team.findMany({ select: { id: true, slug: true } }),
      prisma.notice.findMany({ select: { number: true, updatedAt: true } }),
    ])
    return [
      ...rounds.map((round) => ({
        path: `/matches/archive/${round.league.season.year}/${round.league.slug}/${round.slug}`,
        lastModified: null,
      })),
      ...matches.map((match) => ({
        path: getMatchDetailPath(match),
        lastModified: match.updatedAt.toISOString(),
      })),
      ...referees.map((referee) => ({ path: `/referees/${referee.slug}`, lastModified: null })),
      ...teams.map((team) => ({ path: getTeamDetailPath(team), lastModified: null })),
      ...notices.map((notice) => ({
        path: `/notice/${notice.number}`,
        lastModified: notice.updatedAt.toISOString(),
      })),
    ]
  },
  ["sitemap-entries"],
  { revalidate: 3600 }
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries()
  return [
    ...STATIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...entries.map((entry) => ({
      url: `${SITE_URL}${entry.path}`,
      ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
    })),
  ]
}
