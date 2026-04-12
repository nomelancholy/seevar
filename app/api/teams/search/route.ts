import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name")

  if (!name) {
    return NextResponse.json({ error: "Name parameter is required" }, { status: 400 })
  }

  try {
    const teams = await prisma.team.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        emblemPath: true,
      },
      take: 10,
    })

    return NextResponse.json({
      ok: true,
      teams: teams,
    })
  } catch (error) {
    console.error("[api/teams/search]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
