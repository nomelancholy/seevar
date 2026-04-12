import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { roundId, homeTeamId, awayTeamId, playedAt, venue, roundOrder } = body

    if (!roundId || !homeTeamId || !awayTeamId) {
      return NextResponse.json(
        { error: "roundId, homeTeamId, and awayTeamId are required" },
        { status: 400 }
      )
    }

    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: "Home team and away team cannot be the same" },
        { status: 400 }
      )
    }

    // roundOrder 자동 계산 (제공되지 않은 경우)
    let finalOrder = roundOrder
    if (finalOrder === undefined || finalOrder === null) {
      const maxOrder = await prisma.match.aggregate({
        where: { roundId },
        _max: { roundOrder: true },
      })
      finalOrder = (maxOrder._max.roundOrder ?? 0) + 1
    }

    // 중복 체크 (선택 사항: 동일 라운드/순서 또는 동일 팀 조합 등)
    const existing = await prisma.match.findFirst({
      where: {
        roundId,
        OR: [
          { roundOrder: finalOrder },
          { AND: [{ homeTeamId }, { awayTeamId }] }
        ]
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "A match with this order or these teams already exists in this round" },
        { status: 409 }
      )
    }

    const newMatch = await prisma.match.create({
      data: {
        roundId,
        homeTeamId,
        awayTeamId,
        roundOrder: finalOrder,
        playedAt: playedAt ? new Date(playedAt) : null,
        venue: venue?.trim() || null,
        status: "SCHEDULED"
      }
    })

    revalidatePath("/")
    revalidatePath("/matches")

    return NextResponse.json({
      ok: true,
      match: newMatch
    })
  } catch (error) {
    console.error("[api/matches/POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
