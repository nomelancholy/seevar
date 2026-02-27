"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { ContentStatus } from "@prisma/client"
import { checkProfanity } from "@/lib/filters/profanity"

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

export type ToggleReviewLikeResult = { ok: true; liked: boolean } | { ok: false; error: string }

export async function toggleRefereeReviewLike(reviewId: string): Promise<ToggleReviewLikeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const review = await prisma.refereeReview.findUnique({
    where: { id: reviewId },
    select: { id: true },
  })
  if (!review) return { ok: false, error: "평가를 찾을 수 없습니다." }

  const existing = await prisma.reaction.findUnique({
    where: {
      userId_reviewId: { userId: user.id, reviewId },
    },
  })

  try {
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } })
      revalidatePath("/matches")
      revalidatePath("/referees")
      return { ok: true, liked: false }
    }

    await prisma.reaction.create({
      data: {
        userId: user.id,
        type: "LIKE",
        reviewId,
      },
    })
    revalidatePath("/matches")
    revalidatePath("/referees")
    return { ok: true, liked: true }
  } catch (e) {
    console.error("toggleRefereeReviewLike:", e)
    return { ok: false, error: "좋아요 처리에 실패했습니다." }
  }
}

export type ReportReviewResult = { ok: true } | { ok: false; error: string }

const reportReviewSchema = z.object({
  reviewId: z.string().min(1),
  reason: z.enum(["ABUSE", "SPAM", "INAPPROPRIATE", "FALSE_INFO"], {
    message: "유효하지 않은 신고 사유입니다.",
  }),
  description: z.string().max(500).optional().nullable(),
})

export async function reportRefereeReview(
  reviewId: string,
  reason: string,
  description?: string | null
): Promise<ReportReviewResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const parsed = reportReviewSchema.safeParse({ reviewId, reason, description })
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const review = await prisma.refereeReview.findUnique({
    where: { id: parsed.data.reviewId },
    select: { id: true, comment: true, status: true },
  })
  if (!review) return { ok: false, error: "평가를 찾을 수 없습니다." }

  const already = await prisma.report.findFirst({
    where: { reporterId: user.id, reviewId: parsed.data.reviewId },
  })
  if (already) return { ok: false, error: "이미 신고한 평가입니다." }

  try {
    await prisma.report.create({
      data: {
        reporterId: user.id,
        reason: parsed.data.reason,
        description: parsed.data.description ?? null,
        reviewId: parsed.data.reviewId,
      },
    })
    const profanity = review.comment ? checkProfanity(review.comment) : { isViolated: false, reason: null }

    await prisma.refereeReview.update({
      where: { id: parsed.data.reviewId },
      data: {
        reportCount: { increment: 1 },
        ...(profanity.isViolated && review.status === "VISIBLE"
          ? {
              status: "HIDDEN" as ContentStatus,
              filterReason: profanity.reason,
            }
          : {}),
      },
    })
    revalidatePath("/matches")
    revalidatePath("/referees")
    return { ok: true }
  } catch (e) {
    console.error("reportRefereeReview:", e)
    return { ok: false, error: "신고에 실패했습니다." }
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
