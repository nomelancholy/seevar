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
    const { playedAt, venue } = body

    if (playedAt === undefined && venue === undefined) {
      return NextResponse.json({ error: "No update data provided" }, { status: 400 })
    }

    const updateData: Prisma.MatchUpdateInput = {}
    if (playedAt !== undefined) updateData.playedAt = playedAt ? new Date(playedAt) : null
    if (venue !== undefined) updateData.venue = venue?.trim() || null

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
    console.error("[api/matches/[id]/schedule/PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
