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

/** 알림 등에 쓸 관리자 userId 목록 (ADMIN_USER_IDS + ADMIN_EMAILS로 조회) */
export async function getAdminUserIds(): Promise<string[]> {
  const ids = process.env.ADMIN_USER_IDS?.trim().split(/[\s,]+/).filter(Boolean) ?? []
  const emails = process.env.ADMIN_EMAILS?.trim().split(/[\s,]+/).filter(Boolean) ?? []
  if (ids.length === 0 && emails.length === 0) return []
  const users = await prisma.user.findMany({
    where: {
      OR: [
        ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
        ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
      ],
    },
    select: { id: true },
  })
  return [...new Set(users.map((u) => u.id))]
}

/**
 * 크롤러 API 키 인증 확인.
 * CRAWLER_API_KEY 환경변수가 설정되어 있으면 Authorization: Bearer <key> 또는 x-crawler-api-key 헤더 확인.
 */
export function checkCrawlerAuth(headers: Headers): boolean {
  const apiKey = process.env.CRAWLER_API_KEY
  if (!apiKey) return true // 키가 설정되지 않았으면 인증 패스 (개발 단계)

  const authHeader = headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  const headerKey = headers.get("x-crawler-api-key")

  return bearer === apiKey || headerKey === apiKey
}
