import { z } from "zod"

/** CUID 형식 ID (Prisma 기본) */
export const cuidSchema = z.string().min(1, "ID가 필요합니다.").max(128)

/** 짧은 텍스트 (이름 등) */
export const shortTextSchema = z
  .string()
  .max(100, "100자 이내로 입력해 주세요.")
  .transform((s) => s.trim() || null)

/** 댓글/설명 등 본문 (공백만 있으면 안 됨) */
const MAX_CONTENT = 2000
export const contentSchema = z
  .string()
  .max(MAX_CONTENT, `${MAX_CONTENT}자 이내로 입력해 주세요.`)
  .transform((s) => s.trim())

/** URL (미디어 등) */
export const urlSchema = z
  .string()
  .url("올바른 URL이 아닙니다.")
  .max(2048)
  .optional()
  .nullable()

/** 선택적 URL (빈 문자열 → null) */
export const optionalUrlSchema = z
  .string()
  .max(2048)
  .optional()
  .nullable()
  .transform((s) => (s && s.trim() ? s.trim() : null))
