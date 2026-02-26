"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CreateNoticeResult = { ok: true; number: number } | { ok: false; error: string }
export type UpdateNoticeResult = { ok: true } | { ok: false; error: string }
export type DeleteNoticeResult = { ok: true } | { ok: false; error: string }
export type CreateNoticeCommentResult = { ok: true; id: string } | { ok: false; error: string }

export async function createNotice(
  input: { title: string; content: string; allowComments: boolean }
): Promise<CreateNoticeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "운영자만 공지를 작성할 수 있습니다." }

  const title = input.title?.trim() ?? ""
  const content = input.content?.trim() ?? ""
  if (!title) return { ok: false, error: "제목을 입력해 주세요." }

  try {
    const max = await prisma.notice.aggregate({ _max: { number: true } })
    const number = (max._max.number ?? 0) + 1
    const notice = await prisma.notice.create({
      data: {
        number,
        title,
        content: content || " ",
        authorId: user.id,
        allowComments: !!input.allowComments,
      },
    })
    revalidatePath("/notice")
    return { ok: true, number: notice.number }
  } catch (e) {
    console.error("createNotice:", e)
    return { ok: false, error: "공지 등록에 실패했습니다." }
  }
}

export async function updateNotice(
  id: string,
  input: { title: string; content: string; allowComments: boolean }
): Promise<UpdateNoticeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "운영자만 수정할 수 있습니다." }

  const notice = await prisma.notice.findUnique({ where: { id }, select: { id: true } })
  if (!notice) return { ok: false, error: "공지를 찾을 수 없습니다." }

  const title = input.title?.trim() ?? ""
  if (!title) return { ok: false, error: "제목을 입력해 주세요." }

  try {
    await prisma.notice.update({
      where: { id },
      data: {
        title,
        content: (input.content?.trim() ?? "") || " ",
        allowComments: !!input.allowComments,
      },
    })
    const updated = await prisma.notice.findUnique({ where: { id }, select: { number: true } })
    revalidatePath("/notice")
    if (updated) revalidatePath(`/notice/${updated.number}`)
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
  content: string
): Promise<CreateNoticeCommentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: { id: true, allowComments: true },
  })
  if (!notice) return { ok: false, error: "공지를 찾을 수 없습니다." }
  if (!notice.allowComments) return { ok: false, error: "이 공지는 댓글을 허용하지 않습니다." }

  const trimmed = content?.trim() ?? ""
  if (!trimmed) return { ok: false, error: "내용을 입력해 주세요." }

  try {
    const comment = await prisma.noticeComment.create({
      data: { noticeId, userId: user.id, content: trimmed },
    })
    const notice = await prisma.notice.findUnique({ where: { id: noticeId }, select: { number: true } })
    if (notice) revalidatePath(`/notice/${notice.number}`)
    return { ok: true, id: comment.id }
  } catch (e) {
    console.error("createNoticeComment:", e)
    return { ok: false, error: "댓글 등록에 실패했습니다." }
  }
}
