import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

/**
 * 현재 로그인한 사용자 (세션 기반).
 * 세션이 있으면 DB에서 supportingTeam 등 포함해 반환.
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      supportingTeam: { select: { id: true, name: true, emblemPath: true } },
    },
  })
  return user
}

/** 운영자 여부. ADMIN_USER_IDS 또는 ADMIN_EMAILS에 포함되면 true */
export function getIsAdmin(user: { id?: string; email?: string | null } | null): boolean {
  if (!user) return false
  const ids = process.env.ADMIN_USER_IDS?.trim().split(/[\s,]+/).filter(Boolean) ?? []
  if (user.id && ids.includes(user.id)) return true
  if (!user.email) return false
  const emails = process.env.ADMIN_EMAILS?.trim().split(/[\s,]+/).filter(Boolean) ?? []
  return emails.includes(user.email)
}
