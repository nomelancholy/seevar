import { ImageResponse } from "next/og"

export const alt = "See VAR"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0d0e10",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          See VAR
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.75)",
            fontWeight: 500,
          }}
        >
          축구 판정 아카이브 · 팬 커뮤니티
        </div>
      </div>
    ),
    { ...size }
  )
}
