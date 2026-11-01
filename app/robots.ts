import type { MetadataRoute } from "next"
import { SITE_URL, isIndexableSite } from "@/lib/site"

export const dynamic = "force-dynamic"

export default function robots(): MetadataRoute.Robots {
  // 로컬·dev 서버가 운영과 중복 색인되지 않게 막는다
  if (!isIndexableSite()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 로그인 전용·운영 화면과 API는 수집 대상이 아니다
        disallow: ["/admin", "/api/", "/my", "/login", "/onboarding"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
