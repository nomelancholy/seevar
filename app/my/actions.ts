"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export type UpdateProfileResult = { ok: true } | { ok: false; error: string }

export async function updateProfile(formData: {
  name: string | null
  supportingTeamId: string | null
}): Promise<UpdateProfileResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const name = formData.name?.trim() || null
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name ?? undefined,
      supportingTeamId: formData.supportingTeamId ?? undefined,
    },
  })
  revalidatePath("/my")
  revalidatePath("/")
  return { ok: true }
}

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  await prisma.user.delete({ where: { id: user.id } })
  revalidatePath("/my")
  revalidatePath("/")
  return { ok: true }
}
