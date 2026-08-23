import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { MatchStatus } from "@prisma/client"
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
    const { status } = body

    if (!Object.values(MatchStatus).includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(MatchStatus).join(", ")}` },
        { status: 400 }
      )
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: { status: status as MatchStatus },
    })

    await revalidateMatchViews(matchId)

    return NextResponse.json({
      ok: true,
      match: updatedMatch,
    })
  } catch (error) {
    console.error("[api/matches/[id]/status]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
