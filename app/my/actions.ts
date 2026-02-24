"use server"

import { revalidatePath } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
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

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export type UploadProfileImageResult = { ok: true; url: string } | { ok: false; error: string }

export async function uploadProfileImage(formData: FormData): Promise<UploadProfileImageResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const file = formData.get("image")
  if (!file || !(file instanceof File)) return { ok: false, error: "이미지 파일을 선택해 주세요." }
  if (!ALLOWED_TYPES.includes(file.type))
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." }
  if (file.size > MAX_SIZE) return { ok: false, error: "파일 크기는 2MB 이하여야 합니다." }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeExt = ["jpeg", "jpg", "png", "webp"].includes(ext) ? ext : "jpg"
  const filename = `${user.id}.${safeExt}`
  const dir = path.join(process.cwd(), "public", "uploads", "avatars")

  try {
    await mkdir(dir, { recursive: true })
    const bytes = await file.arrayBuffer()
    const buf = Buffer.from(bytes)
    await writeFile(path.join(dir, filename), buf)
  } catch (e) {
    console.error("uploadProfileImage:", e)
    return { ok: false, error: "파일 저장에 실패했습니다." }
  }

  const url = `/uploads/avatars/${filename}`
  await prisma.user.update({
    where: { id: user.id },
    data: { image: url },
  })
  revalidatePath("/my")
  revalidatePath("/")
  return { ok: true, url }
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
