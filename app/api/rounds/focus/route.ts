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
    const { roundId, leagueId, roundNumber } = body

    let targetRoundId = roundId

    // roundId가 없으면 leagueId + roundNumber로 조회
    if (!targetRoundId) {
      if (!leagueId || roundNumber === undefined) {
        return NextResponse.json(
          { error: "Provide either roundId or both leagueId and roundNumber" },
          { status: 400 }
        )
      }

      const targetRound = await prisma.round.findFirst({
        where: {
          leagueId: leagueId,
          number: roundNumber,
        },
        select: { id: true },
      })

      if (!targetRound) {
        return NextResponse.json({ error: "Round not found" }, { status: 404 })
      }
      targetRoundId = targetRound.id
    }

    // 트랜잭션: 해당 리그의 다른 모든 라운드 isFocus 해제 후 대상 라운드 설정
    // (보통 리그별로 하나만 포커스라고 가정)
    const currentRound = await prisma.round.findUnique({
      where: { id: targetRoundId },
      select: { leagueId: true },
    })

    if (!currentRound) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.round.updateMany({
        where: { leagueId: currentRound.leagueId, isFocus: true },
        data: { isFocus: false },
      }),
      prisma.round.update({
        where: { id: targetRoundId },
        data: { isFocus: true },
      }),
    ])

    // 홈 화면 등에 데이터가 캐시되어 있을 수 있으므로 revalidate
    revalidatePath("/")

    return NextResponse.json({
      ok: true,
      message: `Round ${targetRoundId} is now the focus round.`,
    })
  } catch (error) {
    console.error("[api/rounds/focus]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
