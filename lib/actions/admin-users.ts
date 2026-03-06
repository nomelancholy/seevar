"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateDisplayName } from "@/lib/filters/profanity"

export type UpdateUserNicknameResult = { ok: true } | { ok: false; error: string }

export async function updateUserNickname(
  userId: string,
  name: string | null
): Promise<UpdateUserNicknameResult> {
  const admin = await getCurrentUser()
  if (!admin) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(admin)) return { ok: false, error: "권한이 없습니다." }

  const trimmed = name?.trim() ?? null
  if (trimmed !== null && trimmed !== "") {
    const check = await validateDisplayName(trimmed)
    if (!check.allowed) return { ok: false, error: check.error }
  }

  const finalName = trimmed && trimmed.length > 0 ? trimmed : null
  await prisma.user.update({
    where: { id: userId },
    data: { name: finalName },
  })
  revalidatePath("/admin/users")
  revalidatePath("/admin")
  return { ok: true }
}
