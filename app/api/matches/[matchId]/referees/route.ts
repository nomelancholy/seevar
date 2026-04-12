import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { RefereeRole } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { matchId } = params

  try {
    const body = await request.json()
    const { referees } = body // Expected: Array<{ id: string, role: string }>

    if (!Array.isArray(referees)) {
      return NextResponse.json({ error: "Referees must be an array" }, { status: 400 })
    }

    // 데이터 유효성 검사
    for (const r of referees) {
      if (!Object.values(RefereeRole).includes(r.role)) {
        return NextResponse.json(
          { error: `Invalid role: ${r.role}. Must be one of: ${Object.values(RefereeRole).join(", ")}` },
          { status: 400 }
        )
      }
    }

    // 트랜잭션: 기존 배정 삭제 후 새로운 배정 추가
    await prisma.$transaction([
      prisma.matchReferee.deleteMany({
        where: { matchId: matchId },
      }),
      prisma.matchReferee.createMany({
        data: referees.map((r) => ({
          matchId: matchId,
          refereeId: r.id,
          role: r.role as RefereeRole,
        })),
      }),
    ])

    // 캐시 무효화
    revalidatePath(`/matches/${matchId}`)

    return NextResponse.json({
      ok: true,
      message: `Successfully assigned ${referees.length} referees to match ${matchId}.`,
    })
  } catch (error) {
    console.error("[api/matches/[id]/referees]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
