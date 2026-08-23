import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { RefereeRole } from "@prisma/client"
import { revalidateMatchViews } from "@/lib/revalidate-match-views"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { matchId } = await params

  try {
    const body = await request.json()
    const { referees } = body // Expected: Array<{ id: string, role: string }>

    if (!Array.isArray(referees)) {
      return NextResponse.json({ error: "Referees must be an array" }, { status: 400 })
    }

    // 데이터 유효성 검사
    const assignmentKeys = new Set<string>()
    for (const r of referees) {
      if (!r || typeof r.id !== "string" || r.id.trim() === "") {
        return NextResponse.json({ error: "Each referee must have an id" }, { status: 400 })
      }
      if (!Object.values(RefereeRole).includes(r.role)) {
        return NextResponse.json(
          { error: `Invalid role: ${r.role}. Must be one of: ${Object.values(RefereeRole).join(", ")}` },
          { status: 400 }
        )
      }
      const key = `${r.id}:${r.role}`
      if (assignmentKeys.has(key)) {
        return NextResponse.json({ error: `Duplicate referee assignment: ${key}` }, { status: 400 })
      }
      assignmentKeys.add(key)
    }

    // 동일한 배정 레코드는 유지하고 달라진 항목만 제거/추가한다.
    // RefereeReview는 MatchReferee와 독립된 matchId/refereeId 관계이므로 사용자 평점은 건드리지 않는다.
    const syncResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.matchReferee.findMany({
        where: { matchId },
        select: { id: true, refereeId: true, role: true },
      })
      const existingKeys = new Set(existing.map((r) => `${r.refereeId}:${r.role}`))
      const removeIds = existing
        .filter((r) => !assignmentKeys.has(`${r.refereeId}:${r.role}`))
        .map((r) => r.id)
      const additions = referees.filter(
        (r) => !existingKeys.has(`${r.id}:${r.role}`)
      )

      if (removeIds.length > 0) {
        await tx.matchReferee.deleteMany({ where: { id: { in: removeIds } } })
      }
      if (additions.length > 0) {
        await tx.matchReferee.createMany({
          data: additions.map((r) => ({
            matchId,
            refereeId: r.id,
            role: r.role as RefereeRole,
          })),
        })
      }

      return {
        kept: existing.length - removeIds.length,
        removed: removeIds.length,
        added: additions.length,
      }
    })

    await revalidateMatchViews(matchId)

    return NextResponse.json({
      ok: true,
      message: `Successfully assigned ${referees.length} referees to match ${matchId}.`,
      sync: syncResult,
    })
  } catch (error) {
    console.error("[api/matches/[id]/referees]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
