"use server"

import type { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin, getAdminUserIds } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cleanText } from "@/lib/filters/profanity"

export type CreateNoticeResult = { ok: true; number: number } | { ok: false; error: string }
export type UpdateNoticeResult = { ok: true } | { ok: false; error: string }
export type DeleteNoticeResult = { ok: true } | { ok: false; error: string }
export type CreateNoticeCommentResult = { ok: true; id: string } | { ok: false; error: string }
export type UpdateNoticeCommentResult = { ok: true } | { ok: false; error: string }
export type DeleteNoticeCommentResult = { ok: true } | { ok: false; error: string }

export type NoticeAttachment = { name: string; url: string }

const NOTIFICATION_BATCH_SIZE = 500

async function createNoticeNotificationsInBatches(
  data: Array<{ userId: string; type: "SYSTEM"; content: string; link: string }>,
) {
  for (let i = 0; i < data.length; i += NOTIFICATION_BATCH_SIZE) {
    const batch = data.slice(i, i + NOTIFICATION_BATCH_SIZE)
    await prisma.notification.createMany({ data: batch })
  }
}

export async function createNotice(
  input: {
    title: string
    content: string
    allowComments: boolean
    isPinned: boolean
    sendNotification?: boolean
    attachments?: NoticeAttachment[]
    youtubeUrls?: string[]
  }
): Promise<CreateNoticeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "운영자만 공지를 작성할 수 있습니다." }

  const title = input.title?.trim() ?? ""
  const content = input.content?.trim() ?? ""
  if (!title) return { ok: false, error: "제목을 입력해 주세요." }

  const attachments =
    Array.isArray(input.attachments) && input.attachments.length > 0
      ? (input.attachments as unknown as Prisma.InputJsonValue)
      : undefined
  const youtubeUrls =
    Array.isArray(input.youtubeUrls) && input.youtubeUrls.length > 0
      ? (input.youtubeUrls as unknown as Prisma.InputJsonValue)
      : undefined

  try {
    const max = await prisma.notice.aggregate({ _max: { number: true } })
    const number = (max._max.number ?? 0) + 1
    const notice = await prisma.notice.create({
      data: {
        number,
        title,
        content: content || " ",
        attachments,
        youtubeUrls,
        authorId: user.id,
        allowComments: !!input.allowComments,
        isPinned: !!input.isPinned,
      } as unknown as Prisma.NoticeCreateInput,
    })
    if (input.sendNotification) {
      const userIds = await prisma.user.findMany({
        where: { id: { not: user.id } },
        select: { id: true },
      })
      const link = `/notice/${notice.number}`
      await createNoticeNotificationsInBatches(
        userIds.map((u) => ({ userId: u.id, type: "SYSTEM" as const, content: `새로운 공지가 등록되었습니다 : ${title}`, link })),
      )
    }
    revalidatePath("/notice")
    return { ok: true, number: notice.number }
  } catch (e) {
    console.error("createNotice:", e)
    return { ok: false, error: "공지 등록에 실패했습니다." }
  }
}

async function revalidateNoticeById(noticeId: string) {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: { number: true },
  })
  if (notice) {
    revalidatePath(`/notice/${notice.number}`, "page")
    revalidatePath("/notice", "layout")
  }
}

export async function updateNoticeComment(
  commentId: string,
  content: string,
): Promise<UpdateNoticeCommentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const trimmed = content?.trim() ?? ""
  if (!trimmed) return { ok: false, error: "내용을 입력해 주세요." }

  const { cleanedText } = await cleanText(trimmed)

  const comment = await prisma.noticeComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, noticeId: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }
  if (comment.userId !== user.id) {
    return { ok: false, error: "본인이 작성한 댓글만 수정할 수 있습니다." }
  }

  try {
    await prisma.noticeComment.update({
      where: { id: commentId },
      data: { content: cleanedText },
    })
    await revalidateNoticeById(comment.noticeId)
    return { ok: true }
  } catch (e) {
    console.error("updateNoticeComment:", e)
    return { ok: false, error: "댓글 수정에 실패했습니다." }
  }
}

export async function deleteNoticeComment(
  commentId: string,
): Promise<DeleteNoticeCommentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const comment = await prisma.noticeComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, noticeId: true },
  })
  if (!comment) return { ok: false, error: "댓글을 찾을 수 없습니다." }
  if (comment.userId !== user.id) {
    return { ok: false, error: "본인이 작성한 댓글만 삭제할 수 있습니다." }
  }

  try {
    await prisma.noticeComment.delete({ where: { id: commentId } })
    await revalidateNoticeById(comment.noticeId)
    return { ok: true }
  } catch (e) {
    console.error("deleteNoticeComment:", e)
    return { ok: false, error: "댓글 삭제에 실패했습니다." }
  }
}

export async function updateNotice(
  id: string,
  input: {
    title: string
    content: string
    allowComments: boolean
    isPinned: boolean
    sendNotification?: boolean
    attachments?: NoticeAttachment[]
    youtubeUrls?: string[]
  }
): Promise<UpdateNoticeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "운영자만 수정할 수 있습니다." }

  const notice = await prisma.notice.findUnique({ where: { id }, select: { id: true, number: true } })
  if (!notice) return { ok: false, error: "공지를 찾을 수 없습니다." }

  const title = input.title?.trim() ?? ""
  if (!title) return { ok: false, error: "제목을 입력해 주세요." }

  const attachments =
    Array.isArray(input.attachments) ? (input.attachments as unknown as Prisma.InputJsonValue) : undefined
  const youtubeUrls =
    Array.isArray(input.youtubeUrls) ? (input.youtubeUrls as unknown as Prisma.InputJsonValue) : undefined

  try {
    await prisma.notice.update({
      where: { id },
      data: {
        title,
        content: (input.content?.trim() ?? "") || " ",
        ...(attachments !== undefined && { attachments }),
        ...(youtubeUrls !== undefined && { youtubeUrls }),
        allowComments: !!input.allowComments,
        isPinned: !!input.isPinned,
      },
    })
    if (input.sendNotification) {
      const userIds = await prisma.user.findMany({
        where: { id: { not: user.id } },
        select: { id: true },
      })
      const link = `/notice/${notice.number}`
      await createNoticeNotificationsInBatches(
        userIds.map((u) => ({ userId: u.id, type: "SYSTEM" as const, content: `기존 공지가 수정되었습니다 : ${title}`, link })),
      )
    }
    revalidatePath("/notice")
    revalidatePath(`/notice/${notice.number}`)
    return { ok: true }
  } catch (e) {
    console.error("updateNotice:", e)
    return { ok: false, error: "수정에 실패했습니다." }
  }
}

export async function deleteNotice(id: string): Promise<DeleteNoticeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "운영자만 삭제할 수 있습니다." }

  try {
    await prisma.notice.delete({ where: { id } })
    revalidatePath("/notice")
    return { ok: true }
  } catch (e) {
    console.error("deleteNotice:", e)
    return { ok: false, error: "삭제에 실패했습니다." }
  }
}

export async function createNoticeComment(
  noticeId: string,
  content: string,
  parentId?: string | null
): Promise<CreateNoticeCommentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: { id: true, allowComments: true, number: true, title: true },
  })
  if (!notice) return { ok: false, error: "공지를 찾을 수 없습니다." }
  if (!notice.allowComments) return { ok: false, error: "이 공지는 댓글을 허용하지 않습니다." }

  let parentComment: { userId: string } | null = null
  if (parentId) {
    parentComment = await prisma.noticeComment.findUnique({
      where: { id: parentId, noticeId },
      select: { userId: true },
    })
    if (!parentComment) return { ok: false, error: "답글 대상 댓글을 찾을 수 없습니다." }
  }

  const trimmed = content?.trim() ?? ""
  if (!trimmed) return { ok: false, error: "내용을 입력해 주세요." }

  const { cleanedText } = await cleanText(trimmed)

  try {
    const comment = await prisma.noticeComment.create({
      data: { noticeId, userId: user.id, content: cleanedText, parentId: parentId || undefined },
    })

    const link = `/notice/${notice.number}`
    const replyPreview = cleanedText.slice(0, 80) + (cleanedText.length > 80 ? "…" : "")

    if (parentId && parentComment && parentComment.userId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: parentComment.userId,
          type: "REPLY",
          content: `공지 "${notice.title}" 댓글에 답글이 달렸습니다.`,
          link,
          replyContent: replyPreview,
        },
      })
    } else if (!parentId) {
      const adminIds = await getAdminUserIds()
      const recipientIds = adminIds.filter((id) => id !== user.id)
      if (recipientIds.length > 0) {
        await createNoticeNotificationsInBatches(
          recipientIds.map((adminId) => ({
            userId: adminId,
            type: "SYSTEM" as const,
            content: `공지 "${notice.title}"에 새 댓글이 달렸습니다.`,
            link,
          }))
        )
      }
    }

    revalidatePath(`/notice/${notice.number}`, "page")
    revalidatePath("/notice", "layout")
    return { ok: true, id: comment.id }
  } catch (e) {
    console.error("createNoticeComment:", e)
    return { ok: false, error: "댓글 등록에 실패했습니다." }
  }
}
