import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  output: "standalone",
  // 상위 폴더 lockfile 대신 이 프로젝트를 루트로 사용 (vendor-chunks 경로 등 안정화)
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "phinf.pstatic.net" },
      { protocol: "https", hostname: "ssl.pstatic.net" },
    ],
  },
}

export default nextConfig
