import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  output: "standalone",
  // 작은 서버에서는 타입 검사가 15분 넘게 걸려 사이트까지 멈춘다. 검사는 배포 워크플로의 러너에서 먼저 한다.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // NextAuth(JWT)가 사용하는 jose를 번들에서 제외 → vendor-chunks/jose.js MODULE_NOT_FOUND 방지
  serverExternalPackages: ["jose"],
  // 상위 폴더 lockfile 대신 이 프로젝트를 루트로 사용 (vendor-chunks 경로 등 안정화)
  outputFileTracingRoot: path.join(__dirname),
  // HTTPS 강제: 브라우저에 HSTS 적용 (배포 환경에서 HTTPS 제공 시)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  // 경기 일정 JSON 33개 등 대량 일괄 업로드 시 Chrome 등에서 body 크기 제한에 걸리지 않도록
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "phinf.pstatic.net" },
      { protocol: "https", hostname: "ssl.pstatic.net" },
    ],
  },
}

export default nextConfig
