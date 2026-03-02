import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * 경기 일정 조회 API (외부 크롤러/일렉트론 등에서 호출).
 * 인증: CRAWLER_API_KEY 설정 시 Authorization: Bearer <key> 또는 x-crawler-api-key 헤더 필요.
 * 쿼리: year (선택, 시즌 연도), league 또는 leagueId (선택, 리그 slug. 예: K-league-1, kleague2).
 * 응답 matches[]: homeTeamName/awayTeamName/playedAt/venue 와 함께 크롤러용 별칭 home/away/date/stadium 도 포함.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.CRAWLER_API_KEY
  if (apiKey) {
    const authHeader = request.headers.get("authorization")
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    const headerKey = request.headers.get("x-crawler-api-key")
    if (bearer !== apiKey && headerKey !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get("year")
  const leagueParam = searchParams.get("league") ?? searchParams.get("leagueId")

  const filterYear = yearParam != null && yearParam !== "" ? parseInt(yearParam, 10) : null
  const filterLeagueSlug = leagueParam != null && leagueParam !== "" ? leagueParam.trim() : null

  if (filterYear != null && Number.isNaN(filterYear)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 })
  }

  try {
    const matches = await prisma.match.findMany({
      where: {
        round: {
          league: {
            season: {
              ...(filterYear != null ? { year: filterYear } : {}),
            },
            ...(filterLeagueSlug != null
              ? { slug: { equals: filterLeagueSlug, mode: "insensitive" } }
              : {}),
          },
        },
      },
      orderBy: [{ round: { number: "asc" } }, { roundOrder: "asc" }],
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        round: {
          select: {
            number: true,
            slug: true,
            league: { select: { name: true, slug: true, season: { select: { year: true } } } },
          },
        },
      },
    })

    const items = matches
      .map((m) => {
        const homeName = m.homeTeam.name
        const awayName = m.awayTeam.name
        const playedAtIso = m.playedAt?.toISOString() ?? null
        const venueVal = m.venue ?? null
        return {
          id: m.id,
          year: m.round.league.season.year,
          leagueSlug: m.round.league.slug,
          leagueName: m.round.league.name,
          roundNumber: m.round.number,
          roundSlug: m.round.slug,
          roundOrder: m.roundOrder,
          homeTeamName: homeName,
          awayTeamName: awayName,
          playedAt: playedAtIso,
          venue: venueVal,
          status: m.status,
          scoreHome: m.scoreHome ?? null,
          scoreAway: m.scoreAway ?? null,
          // 크롤러 호환 별칭
          home: homeName,
          away: awayName,
          date: playedAtIso,
          stadium: venueVal,
        }
      })
      .sort(
        (a, b) =>
          a.year - b.year ||
          a.leagueSlug.localeCompare(b.leagueSlug) ||
          a.roundNumber - b.roundNumber ||
          a.roundOrder - b.roundOrder
      )

    return NextResponse.json({
      ok: true,
      count: items.length,
      matches: items,
    })
  } catch (e) {
    console.error("[api/schedule]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
