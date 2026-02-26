"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ContentStatus } from "@prisma/client"

export type SetContentStatusResult = { ok: true } | { ok: false; error: string }

export async function setCommentStatus(
  commentId: string,
  status: ContentStatus
): Promise<SetContentStatusResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, momentId: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }

  try {
    await prisma.comment.update({
      where: { id: commentId },
      data: { status },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/reports")
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    console.error("setCommentStatus:", e)
    return { ok: false, error: "처리에 실패했습니다." }
  }
}

export async function setReviewStatus(
  reviewId: string,
  status: ContentStatus
): Promise<SetContentStatusResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const review = await prisma.refereeReview.findUnique({
    where: { id: reviewId },
    select: { id: true },
  })
  if (!review) return { ok: false, error: "평가를 찾을 수 없습니다." }

  try {
    await prisma.refereeReview.update({
      where: { id: reviewId },
      data: { status },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/reports")
    revalidatePath("/referees")
    revalidatePath("/matches")
    return { ok: true }
  } catch (e) {
    console.error("setReviewStatus:", e)
    return { ok: false, error: "처리에 실패했습니다." }
  }
}
