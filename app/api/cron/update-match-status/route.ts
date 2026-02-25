import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isWithinMatchUpdateWindow, updateMatchStatusBatch } from "@/lib/jobs/update-match-status"

/**
 * 경기 상태 일괄 갱신 (배치/크론 전용).
 * 15분마다 호출하면 되며, 경기가 있는 날의 [가장 이른 경기 3h 전 ~ 가장 늦은 경기 3h 후] 구간에서만 실제 갱신.
 * 그 외에는 200 + skipped: true 로 응답.
 * 인증: CRON_SECRET 설정 시 Authorization: Bearer <CRON_SECRET> 또는 x-cron-secret 헤더.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get("authorization")
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    const headerSecret = request.headers.get("x-cron-secret")
    if (bearer !== secret && headerSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const now = new Date()
    const inWindow = await isWithinMatchUpdateWindow(prisma, now)
    if (!inWindow) {
      return NextResponse.json({ ok: true, skipped: true, reason: "outside_match_window" })
    }
    const { updated } = await updateMatchStatusBatch(prisma)
    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    console.error("[cron] update-match-status error:", e)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
