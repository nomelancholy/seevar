"use client"

import { useEffect, useRef } from "react"

type KakaoAdFitProps = {
  /** PC 환경이어도 모바일용 크기(320x100)의 광고만 노출할지 여부 (너비가 좁은 모달 등에 유용) */
  mobileOnly?: boolean
}

export function KakaoAdFit({ mobileOnly = false }: KakaoAdFitProps) {
  const pcAdRef = useRef<HTMLDivElement>(null)
  const mobileAdRef = useRef<HTMLDivElement>(null)
  const mobileOnlyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 렌더링된 후 광고 스크립트를 삽입
    const loadAd = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (ref.current) {
        // 이미 스크립트가 있다면 중복 삽입 방지
        if (ref.current.querySelector("script")) return

        const script = document.createElement("script")
        script.src = "//t1.kakaocdn.net/kas/static/ba.min.js"
        script.async = true
        ref.current.appendChild(script)
      }
    }

    if (mobileOnly) {
      loadAd(mobileOnlyRef)
    } else {
      loadAd(pcAdRef)
      loadAd(mobileAdRef)
    }
  }, [mobileOnly])

  if (mobileOnly) {
    return (
      <div className="flex flex-col items-center justify-center w-full my-4 md:my-6 bg-muted/10">
        <div ref={mobileOnlyRef} className="flex w-full max-w-[320px] justify-center items-center min-h-[100px]">
          <ins
            className="kakao_ad_area"
            style={{ display: "none" }}
            data-ad-unit="DAN-5RR2d4ZA8UYAar8I"
            data-ad-width="320"
            data-ad-height="100"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center w-full mt-4 mb-10 bg-muted/10">
      {/* PC 버전 광고 (md 이상에서 노출) */}
      <div ref={pcAdRef} className="hidden md:flex w-full max-w-[728px] justify-center items-center min-h-[90px]">
        <ins
          className="kakao_ad_area"
          style={{ display: "none" }}
          data-ad-unit="DAN-DrI5DXHbOXozucIZ"
          data-ad-width="728"
          data-ad-height="90"
        />
      </div>

      {/* 모바일 버전 광고 (md 미만에서 노출) */}
      <div ref={mobileAdRef} className="flex md:hidden w-full max-w-[320px] justify-center items-center min-h-[100px]">
        <ins
          className="kakao_ad_area"
          style={{ display: "none" }}
          data-ad-unit="DAN-5RR2d4ZA8UYAar8I"
          data-ad-width="320"
          data-ad-height="100"
        />
      </div>
    </div>
  )
}
