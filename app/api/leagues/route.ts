import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get("year")
  const filterYear = yearParam ? parseInt(yearParam, 10) : null

  try {
    const leagues = await prisma.league.findMany({
      where: {
        season: filterYear ? { year: filterYear } : {},
      },
      select: {
        id: true,
        name: true,
        slug: true,
        season: {
          select: {
            year: true,
          },
        },
      },
      orderBy: {
        season: {
          year: "desc",
        },
      },
    })

    const results = leagues.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      year: l.season.year,
    }))

    return NextResponse.json({
      ok: true,
      leagues: results,
    })
  } catch (error) {
    console.error("[api/leagues/GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
