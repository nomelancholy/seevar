"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import { createCommentSchema, updateCommentSchema, reportCommentSchema } from "@/lib/schemas/comment"
import type { ContentStatus } from "@prisma/client"
import { checkProfanity } from "@/lib/filters/profanity"

export type CreateCommentResult = { ok: true; commentId: string } | { ok: false; error: string }
export type UpdateCommentResult = { ok: true } | { ok: false; error: string }
export type DeleteCommentResult = { ok: true } | { ok: false; error: string }
export type ToggleCommentLikeResult = { ok: true; liked: boolean } | { ok: false; error: string }
export type ReportCommentResult = { ok: true } | { ok: false; error: string }

const REPORT_REASONS = ["ABUSE", "SPAM", "INAPPROPRIATE", "FALSE_INFO"] as const
type ReportReasonValue = (typeof REPORT_REASONS)[number]

export async function createComment(
  momentId: string,
  input: { content: string; parentId?: string | null; mediaUrl?: string | null }
): Promise<CreateCommentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const parsed = createCommentSchema.safeParse({ momentId, ...input })
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const moment = await prisma.moment.findUnique({
    where: { id: parsed.data.momentId },
    select: { id: true },
  })
  if (!moment) return { ok: false, error: "모멘트를 찾을 수 없습니다." }

  const content = parsed.data.content || " "

  try {
    const comment = await prisma.comment.create({
      data: {
        momentId: parsed.data.momentId,
        userId: user.id,
        content,
        mediaUrl: parsed.data.mediaUrl ?? null,
        parentId: parsed.data.parentId ?? null,
        status: "VISIBLE",
      } as Parameters<typeof prisma.comment.create>[0]["data"],
    })
    await prisma.moment.update({
      where: { id: momentId },
      data: { commentCount: { increment: 1 } },
    })

    if (parsed.data.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parsed.data.parentId },
        select: { userId: true, momentId: true },
      })
      if (parent && parent.userId !== user.id) {
        const momentWithMatch = await prisma.moment.findUnique({
          where: { id: parent.momentId as string },
          select: {
            match: {
              select: {
                roundOrder: true,
                round: {
                  select: {
                    slug: true,
                    league: {
                      select: {
                        slug: true,
                        season: { select: { year: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        })
        const basePath =
          momentWithMatch?.match != null
            ? getMatchDetailPath({
                roundOrder: momentWithMatch.match.roundOrder,
                round: momentWithMatch.match.round as { slug: string; league: { slug: string; season: { year: number } } },
              })
            : null
        const link =
          basePath != null
            ? `${basePath}${basePath.includes("?") ? "&" : "?"}openMoment=${encodeURIComponent(parent.momentId)}`
            : null
        const authorName = user.name?.trim() || "누군가"
        const replyPreview = (content || "").slice(0, 300)
        await prisma.notification.create({
          data: {
            userId: parent.userId,
            type: "REPLY",
            content: `${authorName}님이 회원님의 댓글에 답글을 남겼습니다.`,
            link: link ?? undefined,
            replyContent: replyPreview || undefined,
            momentId: parent.momentId,
          },
        })
      }
    }

    revalidatePath("/")
    revalidatePath("/matches")
    return { ok: true, commentId: comment.id }
  } catch (e) {
    console.error("createComment:", e)
    return { ok: false, error: "댓글 등록에 실패했습니다." }
  }
}

export async function updateComment(commentId: string, content: string): Promise<UpdateCommentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const parsed = updateCommentSchema.safeParse({ commentId, content })
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const comment = await prisma.comment.findUnique({
    where: { id: parsed.data.commentId },
    select: { id: true, userId: true, status: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }
  if (comment.userId !== user.id) return { ok: false, error: "본인이 작성한 댓글만 수정할 수 있습니다." }

  const data: { content: string; status?: ContentStatus; filterReason?: string | null } = {
    content: parsed.data.content,
  }
  if (comment.status === "HIDDEN") {
    data.status = "PENDING_REAPPROVAL"
    data.filterReason = null
  }

  try {
    await prisma.comment.update({
      where: { id: parsed.data.commentId },
      data,
    })
    revalidatePath("/")
    revalidatePath("/matches")
    revalidatePath("/admin/reports")
    return { ok: true }
  } catch (e) {
    console.error("updateComment:", e)
    return { ok: false, error: "댓글 수정에 실패했습니다." }
  }
}

export async function deleteComment(commentId: string): Promise<DeleteCommentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, momentId: true, parentId: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }
  if (comment.userId !== user.id) return { ok: false, error: "본인이 작성한 댓글만 삭제할 수 있습니다." }

  async function countDescendants(parentId: string): Promise<number> {
    const children = await prisma.comment.findMany({
      where: { parentId },
      select: { id: true },
    })
    let n = children.length
    for (const ch of children) {
      n += await countDescendants(ch.id)
    }
    return n
  }
  async function deleteDescendants(parentId: string): Promise<void> {
    const children = await prisma.comment.findMany({
      where: { parentId },
      select: { id: true },
    })
    for (const ch of children) {
      await deleteDescendants(ch.id)
      await prisma.comment.delete({ where: { id: ch.id } })
    }
  }

  try {
    const decrement = 1 + (await countDescendants(commentId))
    await deleteDescendants(commentId)
    await prisma.comment.delete({ where: { id: commentId } })
    await prisma.moment.update({
      where: { id: comment.momentId },
      data: { commentCount: { decrement } },
    })
    revalidatePath("/")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("deleteComment:", e)
    return { ok: false, error: "댓글 삭제에 실패했습니다." }
  }
}

export async function toggleCommentLike(commentId: string): Promise<ToggleCommentLikeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, momentId: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }

  const existing = await prisma.reaction.findUnique({
    where: {
      userId_momentId_commentId: {
        userId: user.id,
        momentId: comment.momentId,
        commentId: commentId,
      },
    },
  })
  try {
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } })
      revalidatePath("/")
      revalidatePath("/matches")
      return { ok: true, liked: false }
    }
    await prisma.reaction.create({
      data: {
        userId: user.id,
        type: "LIKE",
        momentId: comment.momentId,
        commentId: commentId,
      },
    })
    revalidatePath("/")
    revalidatePath("/matches")
    return { ok: true, liked: true }
  } catch (e) {
    console.error("toggleCommentLike:", e)
    return { ok: false, error: "좋아요 처리에 실패했습니다." }
  }
}

export async function reportComment(
  commentId: string,
  reason: string,
  description?: string | null
): Promise<ReportCommentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const parsed = reportCommentSchema.safeParse({ commentId, reason, description })
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const comment = await prisma.comment.findUnique({
    where: { id: parsed.data.commentId },
    select: { id: true, content: true, status: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }

  const already = await prisma.report.findFirst({
    where: { reporterId: user.id, commentId: parsed.data.commentId },
  })
  if (already) return { ok: false, error: "이미 신고한 댓글입니다." }

  try {
    await prisma.report.create({
      data: {
        reporterId: user.id,
        reason: parsed.data.reason,
        description: parsed.data.description ?? null,
        commentId: parsed.data.commentId,
      },
    })
    const profanity = checkProfanity(comment.content)

    await prisma.comment.update({
      where: { id: parsed.data.commentId },
      data: {
        reportCount: { increment: 1 },
        ...(profanity.isViolated && comment.status === "VISIBLE"
          ? {
              status: "HIDDEN" as ContentStatus,
              filterReason: profanity.reason,
            }
          : {}),
      },
    })
    revalidatePath("/")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("reportComment:", e)
    return { ok: false, error: "신고에 실패했습니다." }
  }
}
