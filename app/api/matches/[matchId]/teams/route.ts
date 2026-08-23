import { NextRequest, NextResponse } from "next/server"
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
    const { homeTeamId, awayTeamId } = body

    if (typeof homeTeamId !== "string" || typeof awayTeamId !== "string") {
      return NextResponse.json(
        { error: "homeTeamId and awayTeamId are required" },
        { status: 400 }
      )
    }
    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: "Home team and away team cannot be the same" },
        { status: 400 }
      )
    }

    const updatedMatch = await prisma.$transaction(async (tx) => {
      const [match, teamCount] = await Promise.all([
        tx.match.findUnique({ where: { id: matchId }, select: { roundId: true } }),
        tx.team.count({ where: { id: { in: [homeTeamId, awayTeamId] } } }),
      ])

      if (!match) throw new Error("MATCH_NOT_FOUND")
      if (teamCount !== 2) throw new Error("TEAM_NOT_FOUND")

      const duplicate = await tx.match.findFirst({
        where: {
          id: { not: matchId },
          roundId: match.roundId,
          homeTeamId,
          awayTeamId,
        },
        select: { id: true },
      })
      if (duplicate) throw new Error("DUPLICATE_MATCH")

      return tx.match.update({
        where: { id: matchId },
        data: { homeTeamId, awayTeamId },
      })
    })

    await revalidateMatchViews(matchId)

    return NextResponse.json({ ok: true, match: updatedMatch })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MATCH_NOT_FOUND") {
        return NextResponse.json({ error: "Match not found" }, { status: 404 })
      }
      if (error.message === "TEAM_NOT_FOUND") {
        return NextResponse.json({ error: "Team not found" }, { status: 404 })
      }
      if (error.message === "DUPLICATE_MATCH") {
        return NextResponse.json(
          { error: "The corrected matchup already exists in this round" },
          { status: 409 }
        )
      }
    }
    console.error("[api/matches/[id]/teams/PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
