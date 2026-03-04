"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

const REFEREE_SECTION_ID = "referee-rating"

/** URL 해시 #referee-rating 또는 쿼리 scroll=referee-rating 일 때 심판 평가 섹션으로 스크롤 */
export function ScrollToRefereeSection() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash
    const scrollParam = searchParams.get("scroll")
    const shouldScroll =
      hash === `#${REFEREE_SECTION_ID}` || scrollParam === REFEREE_SECTION_ID
    if (!shouldScroll) return
    const scroll = () => {
      const el = document.getElementById(REFEREE_SECTION_ID)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    const t = setTimeout(scroll, 200)
    return () => clearTimeout(t)
  }, [searchParams])

  return null
}
