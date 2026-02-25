"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

  const moment = await prisma.moment.findUnique({
    where: { id: momentId },
    select: { id: true },
  })
  if (!moment) return { ok: false, error: "모멘트를 찾을 수 없습니다." }

  const content = input.content?.trim() ?? ""
  if (!content && !input.mediaUrl?.trim()) {
    return { ok: false, error: "내용을 입력해 주세요." }
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        momentId,
        userId: user.id,
        content: content || " ",
        mediaUrl: input.mediaUrl?.trim() || null,
        parentId: input.parentId || null,
        status: "VISIBLE",
      } as Parameters<typeof prisma.comment.create>[0]["data"],
    })
    await prisma.moment.update({
      where: { id: momentId },
      data: { commentCount: { increment: 1 } },
    })
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

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }
  if (comment.userId !== user.id) return { ok: false, error: "본인이 작성한 댓글만 수정할 수 있습니다." }

  const trimmed = content?.trim() ?? ""
  if (!trimmed) return { ok: false, error: "내용을 입력해 주세요." }

  try {
    await prisma.comment.update({
      where: { id: commentId },
      data: { content: trimmed },
    })
    revalidatePath("/")
    revalidatePath("/matches")
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

  if (!REPORT_REASONS.includes(reason as ReportReasonValue)) {
    return { ok: false, error: "유효하지 않은 신고 사유입니다." }
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }

  const already = await prisma.report.findFirst({
    where: { reporterId: user.id, commentId },
  })
  if (already) return { ok: false, error: "이미 신고한 댓글입니다." }

  try {
    await prisma.report.create({
      data: {
        reporterId: user.id,
        reason: reason as ReportReasonValue,
        description: description?.trim() || null,
        commentId,
      },
    })
    await prisma.comment.update({
      where: { id: commentId },
      data: { reportCount: { increment: 1 } },
    })
    revalidatePath("/")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("reportComment:", e)
    return { ok: false, error: "신고에 실패했습니다." }
  }
}
