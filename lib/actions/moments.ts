"use server"

import { revalidatePath } from "next/cache"
import type { ReactionType } from "@prisma/client"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CreateMomentResult = { ok: true; momentId: string } | { ok: false; error: string }
export type UpdateMomentResult = { ok: true } | { ok: false; error: string }
export type DeleteMomentResult = { ok: true } | { ok: false; error: string }
export type ToggleMomentSeeVarResult =
  | { ok: true; seeVarCount: number; alreadyClicked: boolean }
  | { ok: false; error: string }

const MAX_MOMENT_DURATION_MINUTES = 15

type MomentInput = {
  title?: string | null
  description?: string | null
  startMinute?: number | null
  endMinute?: number | null
  mediaUrl?: string | null
}

export async function createMoment(
  matchId: string,
  input: MomentInput
): Promise<CreateMomentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }

  const start = input.startMinute ?? null
  const end = input.endMinute ?? null
  if (start != null && end != null) {
    if (end < start) {
      return { ok: false, error: "종료 분은 시작 분보다 같거나 커야 합니다." }
    }
    const duration = end - start
    if (duration > MAX_MOMENT_DURATION_MINUTES) {
      return {
        ok: false,
        error: `모멘트 구간은 최대 ${MAX_MOMENT_DURATION_MINUTES}분까지 가능합니다.`,
      }
    }
  }

  const duration =
    start != null && end != null && end >= start ? end - start : 0

  try {
    const descriptionTrimmed = input.description?.trim() || null
    const moment = await prisma.moment.create({
      data: {
        matchId,
        userId: user.id,
        title: input.title?.trim() || null,
        description: descriptionTrimmed,
        startMinute: start,
        endMinute: end,
        mediaUrl: input.mediaUrl?.trim() || null,
        seeVarCount: 1, // 작성자는 SEE VAR를 한 번 누른 것과 동일
      },
    })
    // 생성 시 작성한 내용·첨부 미디어를 첫 댓글로 등록
    const mediaUrlTrimmed = input.mediaUrl?.trim() || null
    const hasFirstComment = descriptionTrimmed || mediaUrlTrimmed
    if (hasFirstComment) {
      await prisma.comment.create({
        data: {
          momentId: moment.id,
          userId: user.id,
          content: descriptionTrimmed ?? "",
          // Comment.mediaUrl 추가 후 prisma generate 하면 타입에 반영됨
          mediaUrl: mediaUrlTrimmed,
          parentId: null,
          status: "VISIBLE",
        } as { momentId: string; userId: string; content: string; mediaUrl?: string | null; parentId: null; status: "VISIBLE" },
      })
    }
    // duration(정렬용) 및 첫 댓글 시 commentCount 한 번에 반영
    const updateData: { duration?: number; commentCount?: number } = {}
    if (duration > 0) updateData.duration = duration
    if (hasFirstComment) updateData.commentCount = 1
    if (Object.keys(updateData).length > 0) {
      await prisma.moment.update({
        where: { id: moment.id },
        data: updateData,
      })
    }
    revalidatePath("/matches")
    revalidatePath("/")
    return { ok: true, momentId: moment.id }
  } catch (e) {
    console.error("createMoment:", e)
    return { ok: false, error: "모멘트 등록에 실패했습니다." }
  }
}

/** 모멘트는 모두의 게시판이므로 수정 불가 (작성자 포함) */
export async function updateMoment(
  _momentId: string,
  _input: MomentInput
): Promise<UpdateMomentResult> {
  return { ok: false, error: "모멘트 수정은 지원하지 않습니다." }
}

/** 모멘트는 모두의 게시판이므로 삭제 불가 (작성자 포함) */
export async function deleteMoment(_momentId: string): Promise<DeleteMomentResult> {
  return { ok: false, error: "모멘트 삭제는 지원하지 않습니다." }
}

/** 모멘트 SEE VAR 버튼: 로그인 사용자가 한 번만 카운트되도록 Reaction(SEE_VAR)으로 기록 후 seeVarCount +1 */
export async function toggleMomentSeeVar(momentId: string): Promise<ToggleMomentSeeVarResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const moment = await prisma.moment.findUnique({
    where: { id: momentId },
    select: { id: true, seeVarCount: true },
  })
  if (!moment) return { ok: false, error: "모멘트를 찾을 수 없습니다." }

  const existing = await prisma.reaction.findFirst({
    where: {
      userId: user.id,
      momentId,
      commentId: null,
      type: "SEE_VAR" as ReactionType,
    },
  })
  if (existing) {
    return { ok: true, seeVarCount: moment.seeVarCount, alreadyClicked: true }
  }

  await prisma.$transaction([
    prisma.reaction.create({
      data: {
        userId: user.id,
        momentId,
        commentId: null,
        type: "SEE_VAR" as ReactionType,
      },
    }),
    prisma.moment.update({
      where: { id: momentId },
      data: { seeVarCount: { increment: 1 } },
    }),
  ])
  revalidatePath("/")
  revalidatePath("/matches")
  return { ok: true, seeVarCount: moment.seeVarCount + 1, alreadyClicked: false }
}
