"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import { XP_PENALTY_ON_HIDE } from "@/lib/utils/xp"
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
      xpDeductedOnHide: true,
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

  const data: {
    status: ContentStatus
    filterReason?: string | null
    xpDeductedOnHide?: number | null
  } = { status }
  if (status === "HIDDEN" && filterReason !== undefined) data.filterReason = filterReason?.trim() || null

  try {
    if (status === "HIDDEN" && comment.userId && comment.xpDeductedOnHide == null) {
      const user = await prisma.user.findUnique({
        where: { id: comment.userId },
        select: { xp: true },
      })
      if (user) {
        const deduct = Math.min(XP_PENALTY_ON_HIDE, Math.max(0, user.xp))
        if (deduct > 0) {
          await prisma.user.update({
            where: { id: comment.userId },
            data: { xp: { decrement: deduct } },
          })
          data.xpDeductedOnHide = deduct
        }
      }
    } else if (status === "VISIBLE" && (comment.xpDeductedOnHide ?? 0) > 0 && comment.userId) {
      await prisma.user.update({
        where: { id: comment.userId },
        data: { xp: { increment: comment.xpDeductedOnHide! } },
      })
      data.xpDeductedOnHide = null
    }

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
    revalidatePath("/admin/comments")
    revalidatePath("/")
    revalidatePath("/my")
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
    select: {
      id: true,
      userId: true,
      xpDeductedOnHide: true,
      matchId: true,
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
  if (!review) return { ok: false, error: "평가를 찾을 수 없습니다." }

  const data: {
    status: ContentStatus
    filterReason?: string | null
    xpDeductedOnHide?: number | null
  } = { status }
  if (status === "HIDDEN" && filterReason !== undefined) data.filterReason = filterReason?.trim() || null

  try {
    if (status === "HIDDEN" && review.userId && review.xpDeductedOnHide == null) {
      const user = await prisma.user.findUnique({
        where: { id: review.userId },
        select: { xp: true },
      })
      if (user) {
        const deduct = Math.min(XP_PENALTY_ON_HIDE, Math.max(0, user.xp))
        if (deduct > 0) {
          await prisma.user.update({
            where: { id: review.userId },
            data: { xp: { decrement: deduct } },
          })
          data.xpDeductedOnHide = deduct
        }
      }
    } else if (status === "VISIBLE" && (review.xpDeductedOnHide ?? 0) > 0 && review.userId) {
      await prisma.user.update({
        where: { id: review.userId },
        data: { xp: { increment: review.xpDeductedOnHide! } },
      })
      data.xpDeductedOnHide = null
    }

    await prisma.refereeReview.update({
      where: { id: reviewId },
      data,
    })

    if (status === "HIDDEN" && review.userId) {
      const reasonLabel = (filterReason ?? "").trim() || "커뮤니티 가이드라인 위반"
      const link = review.match
        ? getMatchDetailPath({
            roundOrder: review.match.roundOrder,
            round: review.match.round as {
              slug: string
              league: { slug: string; season: { year: number } }
            },
          })
        : undefined
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: "SYSTEM",
          content: `회원님의 심판 한줄평이 '${reasonLabel}' 사유로 숨김 처리되었습니다.`,
          link,
        },
      })
    }

    revalidatePath("/admin")
    revalidatePath("/admin/reports")
    revalidatePath("/admin/reviews")
    revalidatePath("/referees")
    revalidatePath("/matches")
    revalidatePath("/my")
    revalidateTag(`match-reviews-${review.matchId}`)
    return { ok: true }
  } catch (e) {
    console.error("setReviewStatus:", e)
    return { ok: false, error: "처리에 실패했습니다." }
  }
}

export async function replaceCommentWithCute(commentId: string): Promise<SetContentStatusResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      userId: true,
      content: true,
      momentId: true,
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

  const { CUTE_WORDS } = await import("@/lib/filters/profanity")
  const cuteContent = CUTE_WORDS[Math.floor(Math.random() * CUTE_WORDS.length)]!

  await prisma.comment.update({
    where: { id: commentId },
    data: { content: cuteContent },
  })

  let link: string | undefined
  if (comment.moment?.match) {
    const basePath = getMatchDetailPath({
      roundOrder: comment.moment.match.roundOrder,
      round: comment.moment.match.round as {
        slug: string
        league: { slug: string; season: { year: number } }
      },
    })
    link = `${basePath}${basePath.includes("?") ? "&" : "?"}openMoment=${encodeURIComponent(comment.moment.id)}`
  }
  if (comment.userId) {
    await prisma.notification.create({
      data: {
        userId: comment.userId,
        type: "SYSTEM",
        content: "작성하신 댓글이 커뮤니티 가이드에 따라 수정되었습니다.",
        link,
        momentId: comment.momentId,
      },
    })
  }
  revalidatePath("/admin")
  revalidatePath("/admin/comments")
  revalidatePath("/")
  revalidatePath("/matches")
  return { ok: true }
}

export async function replaceReviewWithCute(reviewId: string): Promise<SetContentStatusResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const review = await prisma.refereeReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      userId: true,
      refereeId: true,
      comment: true,
      matchId: true,
      referee: { select: { slug: true } },
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
  if (!review) return { ok: false, error: "한줄평을 찾을 수 없습니다." }
  const raw = (review.comment ?? "").trim()
  if (!raw) return { ok: false, error: "수정할 한줄평 내용이 없습니다." }

  const { CUTE_WORDS } = await import("@/lib/filters/profanity")
  const cuteContent = CUTE_WORDS[Math.floor(Math.random() * CUTE_WORDS.length)]!
  const newComment = cuteContent.slice(0, 100)

  await prisma.refereeReview.update({
    where: { id: reviewId },
    data: { comment: newComment },
  })

  let link: string | undefined
  if (review.match) {
    const basePath = getMatchDetailPath({
      roundOrder: review.match.roundOrder,
      round: review.match.round as {
        slug: string
        league: { slug: string; season: { year: number } }
      },
    })
    const params = new URLSearchParams()
    params.set("scroll", "referee-rating")
    if (review.referee?.slug) params.set("referee", review.referee.slug)
    params.set("reviewId", review.id)
    link = `${basePath}?${params.toString()}`
  }
  if (review.userId) {
    await prisma.notification.create({
      data: {
        userId: review.userId,
        type: "SYSTEM",
        content: "작성하신 심판 한줄평이 커뮤니티 가이드에 따라 수정되었습니다.",
        link,
      },
    })
  }
  revalidatePath("/admin")
  revalidatePath("/admin/reviews")
  revalidatePath("/matches")
  revalidatePath("/referees")
  revalidateTag(`match-reviews-${review.matchId}`)
  return { ok: true }
}
