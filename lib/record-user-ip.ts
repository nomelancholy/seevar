import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"

/** 접속한 유저의 IP를 헤더에서 읽어 User.lastSeenIp에 기록. (layout 등에서 로그인 유저에 대해 호출) */
export async function recordUserIpIfNeeded(userId: string): Promise<void> {
  try {
    const headersList = await headers()
    const forwarded = headersList.get("x-forwarded-for")
    const ip =
      (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
      headersList.get("x-real-ip") ||
      null
    if (!ip) return
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenIp: ip },
    })
  } catch {
    // ignore (e.g. DB unavailable, edge)
  }
}
