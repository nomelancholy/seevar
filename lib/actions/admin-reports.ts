"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import type { ContentStatus } from "@prisma/client"

export type SetContentStatusResult = { ok: true } | { ok: false; error: string }

export async function setCommentStatus(
  commentId: string,
  status: ContentStatus,
  filterReason?: string | null
): Promise<SetContentStatusResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      userId: true,
      momentId: true,
      reportCount: true,
      moment: {
        select: {
          id: true,
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
      },
    },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }

  const data: { status: ContentStatus; filterReason?: string | null } = { status }
  if (status === "HIDDEN" && filterReason !== undefined) data.filterReason = filterReason?.trim() || null

  try {
    await prisma.comment.update({
      where: { id: commentId },
      data,
    })

    // 신고로 인해 숨김 처리된 경우 작성자에게 시스템 알림 전송
    if (status === "HIDDEN" && comment.userId) {
      const reasonLabel = (filterReason ?? "").trim() || "커뮤니티 가이드라인 위반"
      const hasManyReports = (comment.reportCount ?? 0) >= 5
      const countPart = hasManyReports ? "5회 이상" : `${comment.reportCount ?? 1}회`
      const content = `회원님의 댓글이 '${reasonLabel}' 사유 신고가 ${countPart} 접수되어 숨김 처리되었습니다. 내용을 수정해 재심을 요청하면 운영진 검토 후 다시 노출될 수 있습니다.`

      let link: string | undefined
      if (comment.moment?.match) {
        const basePath = getMatchDetailPath({
          roundOrder: comment.moment.match.roundOrder,
          round: comment.moment.match.round as {
            slug: string
            league: { slug: string; season: { year: number } }
          },
        })
        link = `${basePath}${basePath.includes("?") ? "&" : "?"}openMoment=${encodeURIComponent(
          comment.moment.id
        )}`
      }

      await prisma.notification.create({
        data: {
          userId: comment.userId,
          type: "SYSTEM",
          content,
          link,
          momentId: comment.momentId,
        },
      })
    }

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
  status: ContentStatus,
  filterReason?: string | null
): Promise<SetContentStatusResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const review = await prisma.refereeReview.findUnique({
    where: { id: reviewId },
    select: { id: true },
  })
  if (!review) return { ok: false, error: "평가를 찾을 수 없습니다." }

  const data: { status: ContentStatus; filterReason?: string | null } = { status }
  if (status === "HIDDEN" && filterReason !== undefined) data.filterReason = filterReason?.trim() || null

  try {
    await prisma.refereeReview.update({
      where: { id: reviewId },
      data,
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
