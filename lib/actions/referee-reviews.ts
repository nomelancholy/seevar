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
        fanTeamId: user.supportingTeamId ?? undefined,
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

    const fanTeamId = review.fanTeamId ?? user.supportingTeamId ?? null
    if (fanTeamId) {
      await syncRefereeTeamStatForRefereeAndTeam(refereeId, fanTeamId)
    }

    revalidatePath("/matches")
    revalidatePath("/referees")
    revalidatePath("/teams")
    return { ok: true, reviewId: review.id }
  } catch (e) {
    console.error("createRefereeReview:", e)
    return { ok: false, error: "평가 저장에 실패했습니다." }
  }
}

/**
 * (refereeId, teamId)에 대한 RefereeTeamStat을 해당 팀 팬들의 리뷰(RefereeReview) 기준으로 갱신.
 * 평점 제출/수정 시 호출하여 팀별 팬 평점·평가 수가 바로 반영되도록 함.
 */
async function syncRefereeTeamStatForRefereeAndTeam(
  refereeId: string,
  teamId: string
): Promise<void> {
  const reviews = await prisma.refereeReview.findMany({
    where: { refereeId, fanTeamId: teamId, status: "VISIBLE" },
    select: { rating: true },
  })
  const count = reviews.length
  const fanAverageRating =
    count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0

  await prisma.refereeTeamStat.upsert({
    where: {
      refereeId_teamId: { refereeId, teamId },
    },
    update: {
      fanAverageRating,
      totalAssignments: count,
    },
    create: {
      refereeId,
      teamId,
      fanAverageRating,
      totalAssignments: count,
    },
  })
}
