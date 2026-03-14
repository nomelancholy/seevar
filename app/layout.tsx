/** 전역 스타일 — FOUC 방지를 위해 반드시 최상단에서 한 번만 임포트 */
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getCurrentUser, getIsAdmin } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { recordUserIpIfNeeded } from "@/lib/record-user-ip";
import { AppLayout } from "@/components/layout/AppLayout";
import { SessionProvider } from "@/components/auth/SessionProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://seevar.online";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SEE VAR",
  description:
    "K리그 심판 판정을 평가하고 논란의 순간을 기록합니다. 논의한 내용을 바탕으로 IFAB 규정에 기반한 미디어 리포트도 발행합니다.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: "SEE VAR",
    title: "SEE VAR",
    description:
      "K리그 심판 판정을 평가하고 논란의 순간을 기록합니다. 논의한 내용을 바탕으로 IFAB 규정에 기반한 미디어 리포트도 발행합니다.",
    images: [
      {
        url: "/assets/preview_image.png",
        width: 1200,
        height: 630,
        alt: "SEE VAR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SEE VAR",
    description:
      "K리그 심판 판정을 평가하고 논란의 순간을 기록합니다. 논의한 내용을 바탕으로 IFAB 규정에 기반한 미디어 리포트도 발행합니다.",
    images: ["/assets/preview_image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// 빌드 시 DB에 접속하지 않도록 함. 배포 환경에서만 DB 접근.
export const dynamic = "force-dynamic";

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
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  if (user?.id) {
    await recordUserIpIfNeeded(user.id).catch(() => {});
  }
  const isAdmin = user ? getIsAdmin(user) : false;
  const unreadNotificationCount = user
    ? await getUnreadNotificationCount(user.id)
    : 0;
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6300878538210736"
          crossOrigin="anonymous"
        />
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased min-h-screen bg-background text-foreground font-sans"
        suppressHydrationWarning
      >
        <SessionProvider>
          <AppLayout
            user={user}
            isAdmin={isAdmin}
            unreadNotificationCount={unreadNotificationCount}
          >
            {children}
          </AppLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
