"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { type ContentStatus, Prisma } from "@prisma/client"
import {
  checkProfanity,
  cleanText,
  getModerationForStorage,
  type ModerationForStorage,
} from "@/lib/filters/profanity"
import {
  XP_REVIEW_CREATE,
  XP_REVIEW_REPLY_CREATE,
  XP_CONTINUITY_BONUS,
} from "@/lib/utils/xp"

export type CreateRefereeReviewResult =
  | { ok: true; reviewId: string }
  | { ok: false; error: string }
  | { ok: false; error: null; code: "MODERATION_WARNING"; scores: Record<string, number>; flagged: boolean }

export async function createRefereeReview(
  matchId: string,
  refereeId: string,
  role: "MAIN" | "ASSISTANT" | "VAR" | "WAITING",
  rating: number,
  comment?: string | null,
  forceSubmitAfterModeration?: boolean
): Promise<CreateRefereeReviewResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const r = Number(rating)
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return { ok: false, error: "평점은 1~5 정수로 입력해주세요." }
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true, roundId: true },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }
  if (match.status !== "LIVE" && match.status !== "FINISHED") {
    return { ok: false, error: "경기 시작 후에만 평가할 수 있습니다." }
  }

  const assigned = await prisma.matchReferee.findFirst({
    where: { matchId, refereeId, role },
  })
  if (!assigned) {
    return { ok: false, error: "해당 경기에 배정된 심판이 아닙니다." }
  }

  const commentRaw = comment?.trim().slice(0, 100) ?? null
  let commentTrimmed: string | null = null
  let moderation: ModerationForStorage | undefined

  if (forceSubmitAfterModeration && commentRaw) {
    commentTrimmed = commentRaw
    const mod = await getModerationForStorage(commentRaw)
    moderation = mod ?? undefined
  } else if (commentRaw) {
    const cleanResult = await cleanText(commentRaw, { returnModerationWarningInsteadOfReplace: true })
    if (cleanResult.moderationWarning) {
      return {
        ok: false,
        error: null,
        code: "MODERATION_WARNING",
        scores: cleanResult.moderationWarning.scores,
        flagged: cleanResult.moderationWarning.flagged,
      }
    }
    commentTrimmed = cleanResult.cleanedText.slice(0, 100)
    moderation = cleanResult.moderation
  }

  const existingReview = await prisma.refereeReview.findUnique({
    where: {
      matchId_refereeId_userId: { matchId, refereeId, userId: user.id },
    },
    select: { id: true },
  })

  const reviewData = {
    rating: r,
    comment: commentTrimmed,
    role,
    ...(user.supportingTeamId != null && { fanTeamId: user.supportingTeamId }),
    ...(moderation && {
      moderationFlagged: moderation.flagged,
      moderationScores:
        moderation.category_scores != null
          ? (moderation.category_scores as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    }),
  }
  try {
    const review = existingReview
      ? await prisma.refereeReview.update({
          where: { id: existingReview.id },
          data: reviewData as Prisma.RefereeReviewUncheckedUpdateInput,
        })
      : await prisma.refereeReview.create({
          data: {
            matchId,
            refereeId,
            userId: user.id,
            ...reviewData,
          } as Prisma.RefereeReviewUncheckedCreateInput,
        })

    const fanTeamId = review.fanTeamId ?? user.supportingTeamId ?? null
    if (fanTeamId) {
      await syncRefereeTeamStatForRefereeAndTeam(refereeId, fanTeamId)
    }

    if (!existingReview) {
      await prisma.user.update({
        where: { id: user.id },
        data: { xp: { increment: XP_REVIEW_CREATE } },
      })
      // 3경기 연속 평가 보너스: 같은 라운드에서 평가한 경기 수가 3개가 되면 +20 XP
      const reviewsInRound = await prisma.refereeReview.count({
        where: {
          userId: user.id,
          match: { roundId: match.roundId },
        },
      })
      if (reviewsInRound === 3) {
        await prisma.user.update({
          where: { id: user.id },
          data: { xp: { increment: XP_CONTINUITY_BONUS } },
        })
      }
    }

    revalidatePath("/matches")
    revalidatePath("/referees")
    revalidatePath("/teams")
    revalidateTag(`match-reviews-${matchId}`)
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
    select: { id: true, matchId: true },
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
      revalidateTag(`match-reviews-${review.matchId}`)
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
    revalidateTag(`match-reviews-${review.matchId}`)
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

export type CreateReviewReplyResult =
  | { ok: true; replyId: string }
  | { ok: false; error: string }
  | { ok: false; error: null; code: "MODERATION_WARNING"; scores: Record<string, number>; flagged: boolean }

const replyContentSchema = z.string().min(1, "내용을 입력해주세요.").max(500, "500자 이내로 입력해주세요.")

export async function createRefereeReviewReply(
  reviewId: string,
  content: string,
  forceSubmitAfterModeration?: boolean
): Promise<CreateReviewReplyResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const parsed = replyContentSchema.safeParse(content.trim())
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  let contentToSave: string
  if (forceSubmitAfterModeration) {
    contentToSave = parsed.data
  } else {
    const cleanResult = await cleanText(parsed.data, { returnModerationWarningInsteadOfReplace: true })
    if (cleanResult.moderationWarning) {
      return {
        ok: false,
        error: null,
        code: "MODERATION_WARNING",
        scores: cleanResult.moderationWarning.scores,
        flagged: cleanResult.moderationWarning.flagged,
      }
    }
    contentToSave = cleanResult.cleanedText
  }

  const review = await prisma.refereeReview.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true, matchId: true },
  })
  if (!review) return { ok: false, error: "평가를 찾을 수 없습니다." }
  if (review.status !== "VISIBLE") return { ok: false, error: "해당 평가에는 답글을 달 수 없습니다." }

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
  const recentDuplicate = await prisma.refereeReviewReply.findFirst({
    where: {
      reviewId,
      userId: user.id,
      content: contentToSave,
      createdAt: { gte: twoMinutesAgo },
    },
    select: { id: true },
  })
  if (recentDuplicate) {
    return { ok: false, error: "동일한 내용의 답글이 잠시 전에 등록되었습니다." }
  }

  try {
    const reply = await prisma.refereeReviewReply.create({
      data: {
        reviewId,
        userId: user.id,
        content: contentToSave,
      },
    })
    await prisma.user.update({
      where: { id: user.id },
      data: { xp: { increment: XP_REVIEW_REPLY_CREATE } },
    })
    revalidatePath("/matches")
    revalidatePath("/referees")
    revalidateTag(`match-reviews-${review.matchId}`)
    return { ok: true, replyId: reply.id }
  } catch (e) {
    console.error("createRefereeReviewReply:", e)
    return { ok: false, error: "답글 저장에 실패했습니다." }
  }
}

export type ToggleReplyLikeResult = { ok: true; liked: boolean } | { ok: false; error: string }

export async function toggleRefereeReviewReplyLike(
  replyId: string
): Promise<ToggleReplyLikeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const reply = await prisma.refereeReviewReply.findUnique({
    where: { id: replyId },
    select: { id: true, review: { select: { matchId: true } } },
  })
  if (!reply) return { ok: false, error: "답글을 찾을 수 없습니다." }

  const existing = await prisma.reaction.findUnique({
    where: {
      userId_reviewReplyId: { userId: user.id, reviewReplyId: replyId },
    },
  })

  try {
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } })
      revalidatePath("/matches")
      revalidatePath("/referees")
      if (reply.review?.matchId) revalidateTag(`match-reviews-${reply.review.matchId}`)
      return { ok: true, liked: false }
    }
    await prisma.reaction.create({
      data: {
        userId: user.id,
        type: "LIKE",
        reviewReplyId: replyId,
      },
    })
    revalidatePath("/matches")
    revalidatePath("/referees")
    if (reply.review?.matchId) revalidateTag(`match-reviews-${reply.review.matchId}`)
    return { ok: true, liked: true }
  } catch (e) {
    console.error("toggleRefereeReviewReplyLike:", e)
    return { ok: false, error: "좋아요 처리에 실패했습니다." }
  }
}

export type ReportReplyResult = { ok: true } | { ok: false; error: string }

const reportReplySchema = z.object({
  replyId: z.string().min(1),
  reason: z.enum(["ABUSE", "SPAM", "INAPPROPRIATE", "FALSE_INFO"], {
    message: "유효하지 않은 신고 사유입니다.",
  }),
  description: z.string().max(500).optional().nullable(),
})

export type UpdateReviewReplyResult = { ok: true } | { ok: false; error: string }

export async function updateRefereeReviewReply(
  replyId: string,
  content: string
): Promise<UpdateReviewReplyResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const parsed = replyContentSchema.safeParse(content.trim())
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const { cleanedText } = await cleanText(parsed.data)

  const reply = await prisma.refereeReviewReply.findUnique({
    where: { id: replyId },
    select: { id: true, userId: true, review: { select: { matchId: true } } },
  })
  if (!reply) return { ok: false, error: "답글을 찾을 수 없습니다." }
  if (reply.userId !== user.id) return { ok: false, error: "본인이 작성한 답글만 수정할 수 있습니다." }

  try {
    await prisma.refereeReviewReply.update({
      where: { id: replyId },
      data: { content: cleanedText },
    })
    revalidatePath("/matches")
    revalidatePath("/referees")
    if (reply.review?.matchId) revalidateTag(`match-reviews-${reply.review.matchId}`)
    return { ok: true }
  } catch (e) {
    console.error("updateRefereeReviewReply:", e)
    return { ok: false, error: "수정에 실패했습니다." }
  }
}

export type DeleteReviewReplyResult = { ok: true } | { ok: false; error: string }

export async function deleteRefereeReviewReply(replyId: string): Promise<DeleteReviewReplyResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const reply = await prisma.refereeReviewReply.findUnique({
    where: { id: replyId },
    select: { id: true, userId: true, review: { select: { matchId: true } } },
  })
  if (!reply) return { ok: false, error: "답글을 찾을 수 없습니다." }
  if (reply.userId !== user.id) return { ok: false, error: "본인이 작성한 답글만 삭제할 수 있습니다." }

  try {
    await prisma.refereeReviewReply.delete({ where: { id: replyId } })
    revalidatePath("/matches")
    revalidatePath("/referees")
    if (reply.review?.matchId) revalidateTag(`match-reviews-${reply.review.matchId}`)
    return { ok: true }
  } catch (e) {
    console.error("deleteRefereeReviewReply:", e)
    return { ok: false, error: "삭제에 실패했습니다." }
  }
}

export async function reportRefereeReviewReply(
  replyId: string,
  reason: string,
  description?: string | null
): Promise<ReportReplyResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const parsed = reportReplySchema.safeParse({ replyId, reason, description })
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const reply = await prisma.refereeReviewReply.findUnique({
    where: { id: parsed.data.replyId },
    select: { id: true },
  })
  if (!reply) return { ok: false, error: "답글을 찾을 수 없습니다." }

  const already = await prisma.report.findFirst({
    where: { reporterId: user.id, reviewReplyId: parsed.data.replyId },
  })
  if (already) return { ok: false, error: "이미 신고한 답글입니다." }

  try {
    await prisma.report.create({
      data: {
        reporterId: user.id,
        reason: parsed.data.reason,
        description: parsed.data.description ?? null,
        reviewReplyId: parsed.data.replyId,
      },
    })
    revalidatePath("/matches")
    revalidatePath("/referees")
    return { ok: true }
  } catch (e) {
    console.error("reportRefereeReviewReply:", e)
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
