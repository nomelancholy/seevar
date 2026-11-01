import { cache } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

/**
 * 현재 로그인한 사용자 (세션 기반).
 * 세션이 있으면 DB에서 supportingTeam 등 포함해 반환.
 * 한 번의 페이지 렌더링 안에서는 레이아웃·페이지가 각각 불러도 조회는 한 번만 한다 (React cache).
 * 서버 액션·API 라우트에서는 매번 새로 조회한다.
 */
export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      supportingTeam: { select: { id: true, name: true, emblemPath: true } },
    },
  })
  return user
})

/** 운영자 여부. ADMIN_USER_IDS 또는 ADMIN_EMAILS에 포함되면 true */
export function getIsAdmin(user: { id?: string; email?: string | null } | null): boolean {
  if (!user) return false
  const ids = process.env.ADMIN_USER_IDS?.trim().split(/[\s,]+/).filter(Boolean) ?? []
  if (user.id && ids.includes(user.id)) return true
  if (!user.email) return false
  const emails = process.env.ADMIN_EMAILS?.trim().split(/[\s,]+/).filter(Boolean) ?? []
  return emails.includes(user.email)
}

/**
 * 관리자 전용 페이지의 진입 가드. 운영자가 아니면 리다이렉트한다.
 * 레이아웃의 검사만으로는 부족하다: 클라이언트 이동용 요청(RSC)은 "레이아웃은 이미 받았다"고 알리면
 * 레이아웃을 건너뛰고 페이지만 렌더링하므로, 데이터를 읽는 각 페이지에서 직접 호출해야 한다.
 */
export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!getIsAdmin(user)) redirect("/notice")
  return user
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
  if (!apiKey) return process.env.NODE_ENV !== "production"

  const authHeader = headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  const headerKey = headers.get("x-crawler-api-key")

  return bearer === apiKey || headerKey === apiKey
}
