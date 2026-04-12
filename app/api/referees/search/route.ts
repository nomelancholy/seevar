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
    const referees = await prisma.referee.findMany({
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
        link: true,
      },
      take: 10,
    })

    return NextResponse.json({
      ok: true,
      referees: referees,
    })
  } catch (error) {
    console.error("[api/referees/search]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
