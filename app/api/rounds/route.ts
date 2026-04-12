import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get("leagueId")
  const numberParam = searchParams.get("number")

  if (!leagueId) {
    return NextResponse.json({ error: "leagueId is required" }, { status: 400 })
  }

  const num = numberParam ? parseInt(numberParam, 10) : null

  try {
    const rounds = await prisma.round.findMany({
      where: {
        leagueId: leagueId,
        ...(num !== null ? { number: num } : {}),
      },
      orderBy: {
        number: "asc",
      },
    })

    return NextResponse.json({
      ok: true,
      rounds: rounds,
    })
  } catch (error) {
    console.error("[api/rounds/GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { leagueId, number, slug } = body

    if (!leagueId || number === undefined) {
      return NextResponse.json(
        { error: "leagueId and number are required" },
        { status: 400 }
      )
    }

    const num = parseInt(number, 10)
    if (isNaN(num)) {
      return NextResponse.json({ error: "number must be an integer" }, { status: 400 })
    }

    // 리그 존재 확인
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true },
    })
    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // 중복 확인 (번호 또는 슬러그)
    const normalizedSlug = (slug || `round-${num}`).toLowerCase()
    const existing = await prisma.round.findFirst({
      where: {
        leagueId: leagueId,
        OR: [{ number: num }, { slug: normalizedSlug }],
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: "A round with this number or slug already exists in this league" },
        { status: 409 }
      )
    }

    const newRound = await prisma.round.create({
      data: {
        leagueId,
        number: num,
        slug: normalizedSlug,
        isFocus: false, // 기본값 false
      },
    })

    revalidatePath("/")
    revalidatePath("/matches")

    return NextResponse.json({
      ok: true,
      round: newRound,
    })
  } catch (error) {
    console.error("[api/rounds/POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
