import type { Metadata } from "next"

const DEFAULT_SITE_URL = "https://seevar.online"

/**
 * 사이트 기준 URL (canonical, sitemap, 공유 링크용).
 * 운영/dev 서버가 같은 코드를 쓰므로, 배포 때 서버별로 주입되는 NEXTAUTH_URL을 기준으로 삼는다.
 * 값이 비었거나 URL 형식이 아니면 운영 주소로 대체한다 (메타데이터 생성이 예외로 죽지 않게).
 */
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXTAUTH_URL?.trim()
  if (configured) {
    try {
      const url = new URL(configured)
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin
    } catch {
      // 형식 오류 → 기본값
    }
  }
  return DEFAULT_SITE_URL
}

export const SITE_URL = resolveSiteUrl()

/**
 * 검색 수집 허용 여부. 로컬과 dev·staging 서버만 막는다.
 * 판단할 수 없는 주소는 운영으로 보고 허용한다: dev가 색인되는 것보다 운영이 통째로 차단되는 쪽이 훨씬 큰 사고다.
 */
export function isIndexableSite(): boolean {
  const { hostname } = new URL(SITE_URL)
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return false
  if (hostname.endsWith(".localhost") || hostname.endsWith(".test")) return false
  return !/^(dev|staging|stage|test)\./.test(hostname)
}

export const SITE_NAME = "SEE VAR"

const SHARE_IMAGE = { url: "/assets/preview_image.png", width: 1200, height: 630, alt: SITE_NAME }

/** 링크 공유 미리보기(OG/Twitter)의 공통 값 */
export const DEFAULT_OPEN_GRAPH = {
  type: "website",
  locale: "ko_KR",
  siteName: SITE_NAME,
  images: [SHARE_IMAGE],
} satisfies Metadata["openGraph"]

export const DEFAULT_TWITTER = {
  card: "summary_large_image",
  images: [SHARE_IMAGE.url],
} satisfies Metadata["twitter"]

/**
 * 상세 페이지용 메타데이터: 제목·설명·canonical과 공유 미리보기를 한 번에 만든다.
 * Next는 페이지에서 openGraph를 지정하면 레이아웃 값을 통째로 덮어쓰므로 공통 값(이미지 등)을 여기서 다시 넣는다.
 * path는 쿼리 없는 대표 경로. 진입 경로(back) 등 쿼리가 붙은 주소가 모두 같은 문서로 묶인다.
 */
export function buildPageMetadata(page: { title: string; description: string; path: string }): Metadata {
  const { title, description, path } = page
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...DEFAULT_OPEN_GRAPH, title, description, url: path },
    twitter: { ...DEFAULT_TWITTER, title, description },
  }
}
