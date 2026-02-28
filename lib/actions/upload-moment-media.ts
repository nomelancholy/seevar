"use server"

import { getCurrentUser } from "@/lib/auth"
import { uploadToSpaces } from "@/lib/spaces"
import { randomBytes } from "crypto"

export type UploadMomentMediaResult = { ok: true; url: string } | { ok: false; error: string }

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"]
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export async function uploadMomentMedia(formData: FormData): Promise<UploadMomentMediaResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) return { ok: false, error: "파일을 선택해 주세요." }

  const isImage = file.type.startsWith("image/")
  const isVideo = file.type.startsWith("video/")
  if (!isImage && !isVideo) return { ok: false, error: "이미지 또는 영상 파일만 업로드할 수 있습니다." }
  if (![...ALLOWED_IMAGE, ...ALLOWED_VIDEO].includes(file.type)) {
    return { ok: false, error: "지원하지 않는 파일 형식입니다." }
  }
  if (file.size > MAX_SIZE) return { ok: false, error: "파일 크기는 50MB 이하여야 합니다." }

  const ext = file.name.split(".").pop()?.toLowerCase() || (isImage ? "jpg" : "mp4")
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : isImage ? "jpg" : "mp4"
  const filename = `${randomBytes(8).toString("hex")}.${safeExt}`
  const key = `moments/${filename}`

  const bytes = await file.arrayBuffer()
  const buf = Buffer.from(bytes)
  const result = await uploadToSpaces(key, buf, file.type)
  if (!result.ok) return result

  return { ok: true, url: result.url }
}
