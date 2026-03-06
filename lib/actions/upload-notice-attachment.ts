"use server"

import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { uploadToSpaces } from "@/lib/spaces"
import { randomBytes } from "crypto"

export type UploadNoticeAttachmentResult = { ok: true; url: string; name: string } | { ok: false; error: string }

const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain",
  "text/csv",
]

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
}

export async function uploadNoticeAttachment(formData: FormData): Promise<UploadNoticeAttachmentResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "운영자만 공지 첨부를 할 수 있습니다." }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) return { ok: false, error: "파일을 선택해 주세요." }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "지원하지 않는 파일 형식입니다. (이미지, PDF, 문서, 텍스트)" }
  }
  if (file.size > MAX_SIZE_BYTES) return { ok: false, error: "파일 크기는 20MB 이하여야 합니다." }

  const ext = EXT_BY_MIME[file.type] ?? file.name.split(".").pop()?.toLowerCase() ?? "bin"
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin"
  const filename = `${randomBytes(8).toString("hex")}.${safeExt}`
  const key = `notices/${filename}`

  const bytes = await file.arrayBuffer()
  const buf = Buffer.from(bytes)
  const result = await uploadToSpaces(key, buf, file.type)
  if (!result.ok) return result

  return { ok: true, url: result.url, name: file.name }
}
