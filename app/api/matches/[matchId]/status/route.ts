import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { MatchStatus } from "@prisma/client"
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

    // 관련 페이지 캐시 무효화
    revalidatePath("/")
    revalidatePath(`/matches/${matchId}`)

    return NextResponse.json({
      ok: true,
      match: updatedMatch,
    })
  } catch (error) {
    console.error("[api/matches/[id]/status]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
