"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { MatchStatus } from "@prisma/client"

export type UpdateMatchResultActionResult = { ok: true } | { ok: false; error: string }

export async function updateMatchResult(
  matchId: string,
  data: {
    status: MatchStatus
    scoreHome: number | null
    scoreAway: number | null
    firstHalfExtraTime?: number | null
    secondHalfExtraTime?: number | null
    extraFirstHalfExtraTime?: number | null
    extraSecondHalfExtraTime?: number | null
  }
): Promise<UpdateMatchResultActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }

  const scoreHome = data.scoreHome != null && Number.isInteger(data.scoreHome) ? data.scoreHome : null
  const scoreAway = data.scoreAway != null && Number.isInteger(data.scoreAway) ? data.scoreAway : null
  if (scoreHome != null && scoreHome < 0) return { ok: false, error: "홈 득점은 0 이상이어야 합니다." }
  if (scoreAway != null && scoreAway < 0) return { ok: false, error: "원정 득점은 0 이상이어야 합니다." }

  try {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: data.status,
        scoreHome: scoreHome ?? undefined,
        scoreAway: scoreAway ?? undefined,
        firstHalfExtraTime: data.firstHalfExtraTime ?? undefined,
        secondHalfExtraTime: data.secondHalfExtraTime ?? undefined,
        extraFirstHalfExtraTime: data.extraFirstHalfExtraTime ?? undefined,
        extraSecondHalfExtraTime: data.extraSecondHalfExtraTime ?? undefined,
      },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/results")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("updateMatchResult:", e)
    return { ok: false, error: "경기 결과 수정에 실패했습니다." }
  }
}
