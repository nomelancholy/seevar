import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { getPublicBaseUrl } from "@/lib/spaces-config"

/**
 * 관리자 전용: 쟁점 순간 댓글 첨부파일 다운로드.
 * GET /api/admin/download-moment-media?url=encodedUrl
 * url은 우리 Spaces의 moments/ 경로여야 함.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || !getIsAdmin(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get("url")
  if (!rawUrl) {
    return NextResponse.json({ error: "url이 필요합니다." }, { status: 400 })
  }

  let targetUrl: string
  try {
    targetUrl = decodeURIComponent(rawUrl)
  } catch {
    return NextResponse.json({ error: "잘못된 url입니다." }, { status: 400 })
  }

  const baseUrl = getPublicBaseUrl()
  if (!baseUrl) {
    return NextResponse.json({ error: "스토리지 설정이 없습니다." }, { status: 500 })
  }
  const allowedPrefix = `${baseUrl}/moments/`
  if (!targetUrl.startsWith(allowedPrefix)) {
    return NextResponse.json({ error: "허용되지 않은 URL입니다." }, { status: 400 })
  }

  try {
    const res = await fetch(targetUrl, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json(
        { error: `파일을 가져올 수 없습니다 (${res.status})` },
        { status: 502 }
      )
    }
    const contentType = res.headers.get("content-type") ?? "application/octet-stream"
    const contentLength = res.headers.get("content-length")
    const nameFromPath = targetUrl.split("/").pop() ?? "attachment"
    const filename = /^[a-zA-Z0-9_.-]+$/.test(nameFromPath) ? nameFromPath : "attachment"

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
    })
  } catch (e) {
    console.error("download-moment-media:", e)
    return NextResponse.json({ error: "다운로드에 실패했습니다." }, { status: 502 })
  }
}
