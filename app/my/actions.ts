"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { uploadToSpaces } from "@/lib/spaces"
import { validateDisplayName } from "@/lib/filters/profanity"

export type UpdateProfileResult = { ok: true } | { ok: false; error: string }

/** 닉네임만 변경 (내 정보 페이지의 "닉네임 변경" 버튼용) */
export async function updateNickname(
  name: string | null,
): Promise<UpdateProfileResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const trimmed = name?.trim() ?? ""
  if (!trimmed) return { ok: false, error: "닉네임을 입력해 주세요." }

  const nameCheck = await validateDisplayName(trimmed)
  if (!nameCheck.allowed) return { ok: false, error: nameCheck.error }

  const duplicated = await prisma.user.findFirst({
    where: { name: trimmed, NOT: { id: user.id } },
    select: { id: true },
  })
  if (duplicated) {
    return { ok: false, error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해 주세요." }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: trimmed },
  })

  // 닉네임 변경이 반영되어야 하는 캐시들 무효화
  // 1) 내 정보 / 메인
  revalidatePath("/my")
  revalidatePath("/")

  // 2) 이 사용자가 참여한 한줄평/답글이 포함된 경기별 리뷰 캐시
  const [reviews, replies] = await Promise.all([
    prisma.refereeReview.findMany({
      where: { userId: user.id },
      select: { matchId: true },
    }),
    prisma.refereeReviewReply.findMany({
      where: { userId: user.id },
      select: { review: { select: { matchId: true } } },
    }),
  ])

  const matchIds = new Set<string>()
  for (const r of reviews) {
    if (r.matchId) matchIds.add(r.matchId)
  }
  for (const rr of replies) {
    const id = rr.review?.matchId
    if (id) matchIds.add(id)
  }
  for (const matchId of matchIds) {
    revalidateTag(`match-reviews-${matchId}`)
  }

  // 3) 경기 기록 아카이브의 라운드 베스트/워스트 캐시
  revalidateTag("archive-rounds")

  return { ok: true }
}

/** 응원팀만 변경 (내 정보 페이지의 "응원팀 변경" 버튼용) */
export async function updateSupportingTeam(
  supportingTeamId: string | null,
): Promise<UpdateProfileResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { supportingTeamId: true, lastTeamChangeAt: true },
  })
  if (!existing) return { ok: false, error: "사용자 정보를 찾을 수 없습니다." }

  const newTeamId = supportingTeamId ?? null
  const currentTeamId = existing.supportingTeamId
  const isTeamChanged = newTeamId !== currentTeamId

  if (isTeamChanged && existing.lastTeamChangeAt) {
    const nextAvailable = new Date(
      existing.lastTeamChangeAt.getTime() + 180 * 24 * 60 * 60 * 1000,
    )
    if (new Date() < nextAvailable) {
      const y = nextAvailable.getFullYear()
      const m = String(nextAvailable.getMonth() + 1).padStart(2, "0")
      const d = String(nextAvailable.getDate()).padStart(2, "0")
      return {
        ok: false,
        error: `응원팀은 변경 후 6개월(약 180일)이 지나야 다시 변경할 수 있습니다. (다음 변경 가능일: ${y}-${m}-${d})`,
      }
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      supportingTeamId: newTeamId,
      ...(isTeamChanged && { lastTeamChangeAt: new Date() }),
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
