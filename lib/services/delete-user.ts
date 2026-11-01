/**
 * 회원 탈퇴 처리.
 * 한줄평·좋아요·알림은 DB에서 User를 참조(RESTRICT)하고 있어 `user.delete`만으로는 지울 수 없다.
 * 안내 문구("모든 데이터가 소멸")대로 본인이 남긴 기록을 먼저 지우고, 그 기록에서 파생된 집계를 다시 맞춘다.
 *
 * 남는 것 (작성자와 본인이 쓴 글은 비운다):
 * - 본인이 만든 쟁점 순간: 다른 사람들의 토론이 달린 모두의 게시판이므로 시각·유형·이의 제기 수만 유지
 * - 본인이 접수한 신고: 운영 검토가 끝나지 않았을 수 있으므로 사유와 대상만 유지
 */
import type { RefereeRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { syncRefereeRatingStatsForReviews } from "@/lib/referee-stats-sync"

export type DeleteUserResult =
  | { ok: true; /** 한줄평이 지워진 경기 (경기별 평가 캐시 무효화용) */ reviewedMatchIds: string[] }
  | { ok: false; reason: "NOT_FOUND" | "HAS_NOTICES" }

type DeletedReview = {
  refereeId: string
  matchId: string
  role: RefereeRole
  fanTeamId: string | null
}

export async function deleteUserAndContent(userId: string): Promise<DeleteUserResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, _count: { select: { notices: true } } },
  })
  if (!user) return { ok: false, reason: "NOT_FOUND" }
  // 공지는 작성자 삭제 시 함께 지워지도록(CASCADE) 묶여 있다. 운영자 계정이 실수로 탈퇴해 공지가 사라지지 않게 막는다.
  if (user._count.notices > 0) return { ok: false, reason: "HAS_NOTICES" }

  const deletedReviews = await prisma.$transaction(async (tx) => {
    const reviews = await tx.refereeReview.findMany({
      where: { userId },
      select: { id: true, refereeId: true, matchId: true, role: true, fanTeamId: true },
    })
    const reviewIds = reviews.map((review) => review.id)

    // 내 댓글과 그 아래 달린 답글 전체 (댓글 삭제 시 답글 스레드도 함께 지워진다)
    const ownComments = await tx.comment.findMany({
      where: { userId },
      select: { id: true, momentId: true },
    })
    const commentIds = new Set(ownComments.map((comment) => comment.id))
    const momentIds = new Set(ownComments.map((comment) => comment.momentId))
    let frontier = [...commentIds]
    while (frontier.length > 0) {
      const children = await tx.comment.findMany({
        where: { parentId: { in: frontier }, id: { notIn: [...commentIds] } },
        select: { id: true },
      })
      frontier = children.map((child) => child.id)
      for (const id of frontier) commentIds.add(id)
    }

    // 내가 누른 이의 제기(SEE VAR)는 모멘트 카운터에 합산돼 있으므로 함께 되돌린다
    const seeVarReactions = await tx.reaction.findMany({
      where: { userId, type: "SEE_VAR", commentId: null, momentId: { not: null } },
      select: { momentId: true },
    })
    const seeVarByMoment = new Map<string, number>()
    for (const reaction of seeVarReactions) {
      if (!reaction.momentId) continue
      seeVarByMoment.set(reaction.momentId, (seeVarByMoment.get(reaction.momentId) ?? 0) + 1)
    }

    // 대상이 사라지면 좋아요·신고는 대상 없는 행으로 남으므로(SET NULL) 먼저 지운다
    await tx.reaction.deleteMany({
      where: {
        OR: [{ userId }, { reviewId: { in: reviewIds } }, { commentId: { in: [...commentIds] } }],
      },
    })
    await tx.report.deleteMany({
      where: {
        OR: [{ reviewId: { in: reviewIds } }, { commentId: { in: [...commentIds] } }],
      },
    })
    // 내가 접수한 신고는 신고자와 직접 쓴 설명만 비우고 남긴다 (운영자의 신고 목록에서 사라지지 않게)
    await tx.report.updateMany({
      where: { reporterId: userId },
      data: { reporterId: null, description: null },
    })
    // 내가 만든 쟁점 순간은 유지하되 직접 쓴 글과 첨부는 비운다 (작성자는 User 삭제 시 NULL 처리)
    await tx.moment.updateMany({
      where: { userId },
      data: { title: null, description: null, mediaUrl: null },
    })
    await tx.notification.deleteMany({ where: { userId } })
    await tx.refereeReviewReply.deleteMany({ where: { userId } })
    await tx.refereeReview.deleteMany({ where: { userId } })

    for (const [momentId, count] of seeVarByMoment) {
      const moment = await tx.moment.findUnique({ where: { id: momentId }, select: { seeVarCount: true } })
      if (!moment) continue
      await tx.moment.update({
        where: { id: momentId },
        data: { seeVarCount: Math.max(0, moment.seeVarCount - count) },
      })
    }

    // 계정·세션·댓글·투표는 User 삭제에 연쇄(CASCADE)로 지워진다
    await tx.user.delete({ where: { id: userId } })

    for (const momentId of momentIds) {
      const commentCount = await tx.comment.count({ where: { momentId } })
      await tx.moment.update({ where: { id: momentId }, data: { commentCount } })
    }

    return reviews as DeletedReview[]
  }, { timeout: 30_000 })

  // 지워진 평가가 빠진 상태로 팬 평점 파생값을 다시 집계
  await syncRefereeRatingStatsForReviews(deletedReviews)

  return { ok: true, reviewedMatchIds: [...new Set(deletedReviews.map((review) => review.matchId))] }
}
