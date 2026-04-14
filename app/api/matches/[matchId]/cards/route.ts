import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { RefereeRole } from "@prisma/client"
import { revalidatePath } from "next/cache"

/**
 * 카드 부여 정보 업데이트 API.
 * 사용자 요청에 따라 주심(MAIN)의 레코드에만 기록합니다.
 */
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
      homeYellowCards,
      homeRedCards,
      awayYellowCards,
      awayRedCards,
    } = body

    // 해당 경기의 주심(MAIN) 찾기
    const mainReferee = await prisma.matchReferee.findFirst({
      where: {
        matchId: matchId,
        role: RefereeRole.MAIN,
      },
    })

    if (!mainReferee) {
      return NextResponse.json(
        { error: "Main referee (주심) not found for this match. Assign a main referee first." },
        { status: 404 }
      )
    }

    const updatedMatchReferee = await prisma.matchReferee.update({
      where: { id: mainReferee.id },
      data: {
        homeYellowCards: homeYellowCards ?? mainReferee.homeYellowCards,
        homeRedCards: homeRedCards ?? mainReferee.homeRedCards,
        awayYellowCards: awayYellowCards ?? mainReferee.awayYellowCards,
        awayRedCards: awayRedCards ?? mainReferee.awayRedCards,
      },
    })

    // 관련 페이지 캐시 무효화
    revalidatePath(`/matches/${matchId}`)

    return NextResponse.json({
      ok: true,
      matchReferee: updatedMatchReferee,
    })
  } catch (error) {
    console.error("[api/matches/[id]/cards]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
