"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CreateRefereeReviewResult =
  | { ok: true; reviewId: string }
  | { ok: false; error: string }

export async function createRefereeReview(
  matchId: string,
  refereeId: string,
  role: "MAIN" | "ASSISTANT" | "VAR" | "WAITING",
  rating: number,
  comment?: string | null
): Promise<CreateRefereeReviewResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const r = Number(rating)
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return { ok: false, error: "평점은 1~5 정수로 입력해주세요." }
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }
  if (match.status !== "FINISHED") {
    return { ok: false, error: "경기 종료 후에만 평가할 수 있습니다." }
  }

  const assigned = await prisma.matchReferee.findFirst({
    where: { matchId, refereeId, role },
  })
  if (!assigned) {
    return { ok: false, error: "해당 경기에 배정된 심판이 아닙니다." }
  }

  const commentTrimmed = comment?.trim().slice(0, 100) ?? null

  try {
    const review = await prisma.refereeReview.upsert({
      where: {
        matchId_refereeId_userId: { matchId, refereeId, userId: user.id },
      },
      update: {
        rating: r,
        comment: commentTrimmed,
        role,
      },
      create: {
        matchId,
        refereeId,
        userId: user.id,
        fanTeamId: user.supportingTeamId ?? undefined,
        rating: r,
        comment: commentTrimmed,
        role,
      },
    })
    revalidatePath("/matches")
    revalidatePath("/referees")
    return { ok: true, reviewId: review.id }
  } catch (e) {
    console.error("createRefereeReview:", e)
    return { ok: false, error: "평가 저장에 실패했습니다." }
  }
}
