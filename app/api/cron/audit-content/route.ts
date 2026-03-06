import { NextResponse } from "next/server"
import { runAuditContent } from "@/lib/jobs/audit-content"

/**
 * 기존 글·닉네임 검수 (크론/수동 호출용).
 * GET: 검수만 수행, 보고서 JSON 반환.
 * POST: body { apply?: boolean, skipNicknames?: boolean, skipContent?: boolean, renameViolatingNicknames?: boolean } 지원.
 * 인증: CRON_SECRET 설정 시 Authorization: Bearer <CRON_SECRET> 또는 x-cron-secret 헤더.
 */
export async function GET(request: Request) {
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
    const report = await runAuditContent({})
    return NextResponse.json(report)
  } catch (e) {
    console.error("[cron] audit-content error:", e)
    return NextResponse.json({ error: "Audit failed" }, { status: 500 })
  }
}

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

  let body: {
    apply?: boolean
    skipNicknames?: boolean
    skipContent?: boolean
    renameViolatingNicknames?: boolean
  } = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    // ignore
  }

  try {
    const report = await runAuditContent({
      apply: body.apply,
      skipNicknames: body.skipNicknames,
      skipContent: body.skipContent,
      renameViolatingNicknames: body.renameViolatingNicknames,
    })
    return NextResponse.json(report)
  } catch (e) {
    console.error("[cron] audit-content error:", e)
    return NextResponse.json({ error: "Audit failed" }, { status: 500 })
  }
}
