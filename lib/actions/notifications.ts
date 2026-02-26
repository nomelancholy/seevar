"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function markAllNotificationsRead(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  try {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })
    revalidatePath("/")
    revalidatePath("/my/notifications")
    return { ok: true }
  } catch (e) {
    console.error("markAllNotificationsRead:", e)
    return { ok: false, error: "처리에 실패했습니다." }
  }
}

/** 단일 알림 읽음 처리 (클릭 시 호출) */
export async function markNotificationRead(notificationId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  try {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true },
    })
    revalidatePath("/")
    revalidatePath("/my/notifications")
    return { ok: true }
  } catch (e) {
    console.error("markNotificationRead:", e)
    return { ok: false, error: "처리에 실패했습니다." }
  }
}

export type NotificationItem = {
  id: string
  content: string
  link: string | null
  /** 답글 알림일 때 달린 답글 내용 미리보기 */
  replyContent: string | null
  isRead: boolean
  createdAt: string
}

/** 현재 유저 알림 목록 (모달용) */
export async function getNotificationsForCurrentUser(): Promise<{ ok: true; items: NotificationItem[] } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  try {
    const list = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, content: true, link: true, replyContent: true, isRead: true, createdAt: true },
    })
    const items: NotificationItem[] = list.map((n) => ({
      id: n.id,
      content: n.content,
      link: n.link,
      replyContent: n.replyContent ?? null,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }))
    return { ok: true, items }
  } catch (e) {
    console.error("getNotificationsForCurrentUser:", e)
    return { ok: false, error: "알림을 불러올 수 없습니다." }
  }
}
