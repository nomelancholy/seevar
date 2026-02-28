"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { updateProfileSchema } from "@/lib/schemas/profile"
import { uploadToSpaces } from "@/lib/spaces"

export type UpdateProfileResult = { ok: true } | { ok: false; error: string }

export async function updateProfile(formData: {
  name: string | null
  supportingTeamId: string | null
}): Promise<UpdateProfileResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const parsed = updateProfileSchema.safeParse(formData)
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return { ok: false, error: msg }
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { supportingTeamId: true, lastTeamChangeAt: true },
  })
  if (!existing) {
    return { ok: false, error: "사용자 정보를 찾을 수 없습니다." }
  }

  const newTeamId: string | null = parsed.data.supportingTeamId ?? null
  const currentTeamId: string | null = existing.supportingTeamId

  const isTeamChanged = newTeamId !== currentTeamId

  if (isTeamChanged && existing.lastTeamChangeAt) {
    const last = existing.lastTeamChangeAt
    const nextAvailable = new Date(last.getTime() + 180 * 24 * 60 * 60 * 1000)
    const now = new Date()
    if (now < nextAvailable) {
      const y = nextAvailable.getFullYear()
      const m = String(nextAvailable.getMonth() + 1).padStart(2, "0")
      const d = String(nextAvailable.getDate()).padStart(2, "0")
      return {
        ok: false,
        error: `응원팀은 변경 후 6개월(약 180일)이 지나야 다시 변경할 수 있습니다. (다음 변경 가능일: ${y}-${m}-${d})`,
      }
    }
  }

  const updateData: {
    name?: string | null
    supportingTeamId?: string | null
    lastTeamChangeAt?: Date
  } = {}

  updateData.name = parsed.data.name ?? undefined
  updateData.supportingTeamId = newTeamId
  if (isTeamChanged) {
    updateData.lastTeamChangeAt = new Date()
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
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
  const key = `avatars/${filename}`

  const bytes = await file.arrayBuffer()
  const buf = Buffer.from(bytes)
  const result = await uploadToSpaces(key, buf, file.type)
  if (!result.ok) return result

  const url = result.url
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
