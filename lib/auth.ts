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
