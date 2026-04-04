"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import type { ReactionType } from "@prisma/client"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import { XP_MOMENT_CREATE, XP_BEST_MOMENT } from "@/lib/utils/xp"
import { cleanText } from "@/lib/filters/profanity"

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
  /** 구간(전반/후반/연장 전반/연장 후반). 90+2 vs 연장 전반 2분 구분용 */
  startPeriod?: string | null
  /** 구간 내 분. startPeriod와 함께 저장 시 사용 */
  startMinuteInPeriod?: number | null
  endMinute?: number | null
  mediaUrl?: string | null
  poll?: {
    title: string
    options: string[]
  } | null
}

export async function createMoment(
  matchId: string,
  input: MomentInput
): Promise<CreateMomentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      _count: { select: { matchReferees: true } },
    },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }
  if (match.status === "CANCELLED") {
    return { ok: false, error: "취소된 경기에는 이슈를 등록할 수 없습니다." }
  }
  if (match._count.matchReferees < 1) {
    return { ok: false, error: "심판이 배정된 후에 이슈를 등록할 수 있습니다." }
  }

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

  const rawPoll = input.poll
  const pollToCreate =
    rawPoll
      ? (() => {
          const title = rawPoll.title?.trim() ?? ""
          const options = (rawPoll.options ?? [])
            .map((o) => o.trim())
            .filter((o) => o.length > 0)
          if (!title || options.length < 2) return null
          const limited = options.slice(0, 6)
          return { title, options: limited }
        })()
      : null

  try {
    const titleRaw = input.title?.trim() || null
    const descriptionRaw = input.description?.trim() || null
    const [titleCleaned, descriptionCleaned] = await Promise.all([
      titleRaw ? cleanText(titleRaw).then((r) => r.cleanedText) : Promise.resolve(null),
      descriptionRaw ? cleanText(descriptionRaw).then((r) => r.cleanedText) : Promise.resolve(null),
    ])
    const moment = await prisma.moment.create({
      data: {
        matchId,
        userId: user.id,
        title: titleCleaned ?? null,
        description: descriptionCleaned ?? null,
        startMinute: start,
        startPeriod: input.startPeriod?.trim() || null,
        startMinuteInPeriod: input.startMinuteInPeriod ?? null,
        endMinute: end,
        mediaUrl: input.mediaUrl?.trim() || null,
        seeVarCount: 1, // 작성자는 SEE VAR를 한 번 누른 것과 동일
      },
    })
    // 생성 시 작성한 내용·첨부 미디어를 첫 댓글로 등록 (필터 적용된 설명 사용)
    const mediaUrlTrimmed = input.mediaUrl?.trim() || null
    const hasFirstComment =
      (descriptionCleaned ?? "") !== "" || mediaUrlTrimmed || pollToCreate
    if (hasFirstComment) {
      const comment = await prisma.comment.create({
        data: {
          momentId: moment.id,
          userId: user.id,
          content: descriptionCleaned ?? "",
          mediaUrl: mediaUrlTrimmed,
          parentId: null,
          status: "VISIBLE",
        } as { momentId: string; userId: string; content: string; mediaUrl?: string | null; parentId: null; status: "VISIBLE" },
      })
      if (pollToCreate) {
        await prisma.poll.create({
          data: {
            commentId: comment.id,
            title: pollToCreate.title,
            options: {
              create: pollToCreate.options.map((label, idx) => ({
                label,
                order: idx,
              })),
            },
          },
        })
      }
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
    await prisma.user.update({
      where: { id: user.id },
      data: { xp: { increment: XP_MOMENT_CREATE } },
    })
    revalidateTag("match-details")
    revalidateTag("archive-rounds")
    revalidatePath("/matches")
    revalidatePath("/")
    // 경기 기록 페이지에서 쟁점 카드가 바로 보이도록 해당 경기 상세 경로 명시적 무효화
    const matchForPath = await prisma.match.findUnique({
      where: { id: matchId },
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
    })
    if (matchForPath?.round) {
      const matchPath = getMatchDetailPath({
        roundOrder: matchForPath.roundOrder,
        round: {
          slug: matchForPath.round.slug,
          league: {
            slug: matchForPath.round.league.slug,
            season: { year: matchForPath.round.league.season.year },
          },
        },
      })
      revalidatePath(matchPath)
    }
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
    select: { id: true, seeVarCount: true, userId: true },
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

  const isNewSeeVarByOther = moment.userId && moment.userId !== user.id

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
    ...(isNewSeeVarByOther
      ? [
          prisma.user.update({
            where: { id: moment.userId! },
            data: { xp: { increment: XP_BEST_MOMENT } },
          }),
        ]
      : []),
  ])
  revalidateTag("match-details")
  revalidateTag("archive-rounds")
  revalidatePath("/")
  revalidatePath("/matches")
  return { ok: true, seeVarCount: moment.seeVarCount + 1, alreadyClicked: false }
}
