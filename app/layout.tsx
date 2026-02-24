/** 전역 스타일 — FOUC 방지를 위해 반드시 최상단에서 한 번만 임포트 */
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { getCurrentUser } from "@/lib/auth"
import { AppLayout } from "@/components/layout/AppLayout"
import { SessionProvider } from "@/components/auth/SessionProvider"

export const metadata: Metadata = {
  title: "See VAR",
  description: "축구 판정 아카이브 및 커뮤니티",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

// 페이지 이동 시 CSS 로딩 지연/순서 이슈로 스타일이 잠깐 빠지는 현상 방지.
// 최소한의 크리티컬 스타일을 인라인으로 넣어 항상 배경·글자색·폰트가 적용되도록 함.
const criticalCss = `
  html, body {
    background-color: #0d0e10;
    color: #ffffff;
    font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
`

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground font-sans" suppressHydrationWarning>
        <SessionProvider>
          <AppLayout user={user}>{children}</AppLayout>
        </SessionProvider>
      </body>
    </html>
  )
}
