import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { matchId } = params

  try {
    const body = await request.json()
    const {
      scoreHome,
      scoreAway,
      firstHalfExtraTime,
      secondHalfExtraTime,
      extraFirstHalfExtraTime,
      extraSecondHalfExtraTime,
    } = body

    const updateData: any = {}
    if (scoreHome !== undefined) updateData.scoreHome = scoreHome
    if (scoreAway !== undefined) updateData.scoreAway = scoreAway
    if (firstHalfExtraTime !== undefined) updateData.firstHalfExtraTime = firstHalfExtraTime
    if (secondHalfExtraTime !== undefined) updateData.secondHalfExtraTime = secondHalfExtraTime
    if (extraFirstHalfExtraTime !== undefined) updateData.extraFirstHalfExtraTime = extraFirstHalfExtraTime
    if (extraSecondHalfExtraTime !== undefined) updateData.extraSecondHalfExtraTime = extraSecondHalfExtraTime

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No data provided for update" }, { status: 400 })
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
    })

    // 캐시 무효화
    revalidatePath("/")
    revalidatePath(`/matches/${matchId}`)

    return NextResponse.json({
      ok: true,
      match: updatedMatch,
    })
  } catch (error) {
    console.error("[api/matches/[id]/result]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
