import { z } from "zod"
import { shortTextSchema } from "./common"

export const updateProfileSchema = z.object({
  name: shortTextSchema.nullable(),
  supportingTeamId: z.string().max(128).nullable(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
