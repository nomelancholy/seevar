import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  output: "standalone",
  // NextAuth(JWT)가 사용하는 jose를 번들에서 제외 → vendor-chunks/jose.js MODULE_NOT_FOUND 방지
  serverExternalPackages: ["jose"],
  // 상위 폴더 lockfile 대신 이 프로젝트를 루트로 사용 (vendor-chunks 경로 등 안정화)
  outputFileTracingRoot: path.join(__dirname),
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
