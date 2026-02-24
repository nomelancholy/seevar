import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  // 상위 폴더 lockfile 대신 이 프로젝트를 루트로 사용 (vendor-chunks 경로 등 안정화)
  outputFileTracingRoot: path.join(__dirname),
  images: {
    domains: ["phinf.pstatic.net"],
    remotePatterns: [
      { protocol: "https", hostname: "phinf.pstatic.net", pathname: "/**" },
    ],
  },
}

export default nextConfig
