import { z } from "zod"
import { cuidSchema, optionalUrlSchema } from "./common"

export const createCommentSchema = z
  .object({
    momentId: cuidSchema,
    content: z.string().max(2000).transform((s) => (s ?? "").trim()),
    parentId: cuidSchema.optional().nullable(),
    mediaUrl: optionalUrlSchema,
  })
  .refine((data) => (data.content?.length ?? 0) > 0 || (data.mediaUrl?.length ?? 0) > 0, {
    message: "내용을 입력하거나 미디어를 첨부해 주세요.",
    path: ["content"],
  })
export type CreateCommentInput = z.infer<typeof createCommentSchema>

export const updateCommentSchema = z.object({
  commentId: cuidSchema,
  content: z.string().min(1, "내용을 입력해 주세요.").max(2000).transform((s) => s.trim()),
})
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>

export const reportCommentSchema = z.object({
  commentId: cuidSchema,
  reason: z.enum(["ABUSE", "SPAM", "INAPPROPRIATE", "FALSE_INFO"], {
    message: "유효하지 않은 신고 사유입니다.",
  }),
  description: z.string().max(500).optional().nullable(),
})
export type ReportCommentInput = z.infer<typeof reportCommentSchema>
