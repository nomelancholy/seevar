import { prisma } from "@/lib/prisma"

/**
 * 현재 로그인한 사용자.
 * TODO: NextAuth getServerSession 등으로 교체.
 * 개발용: DB에 사용자가 있으면 첫 번째 사용자 반환.
 */
export async function getCurrentUser() {
  const user = await prisma.user.findFirst({
    include: {
      supportingTeam: { select: { id: true, name: true, emblemPath: true } },
    },
  })
  return user
}
