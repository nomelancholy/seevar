import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { revalidateMatchViews } from "@/lib/revalidate-match-views"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { matchId } = await params

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

    const updateData: Prisma.MatchUpdateInput = {}
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

    await revalidateMatchViews(matchId)

    return NextResponse.json({
      ok: true,
      match: updatedMatch,
    })
  } catch (error) {
    console.error("[api/matches/[id]/result]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
