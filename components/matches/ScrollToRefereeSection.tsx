"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

const REFEREE_SECTION_ID = "referee-rating"

/** URL 해시 #referee-rating 또는 쿼리 scroll=referee-rating 일 때 심판 평가 섹션으로 스크롤. reviewId 있으면 해당 한줄평 행까지 스크롤·포커스 */
export function ScrollToRefereeSection() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash
    const scrollParam = searchParams.get("scroll")
    const reviewId = searchParams.get("reviewId")
    const shouldScroll =
      hash === `#${REFEREE_SECTION_ID}` || scrollParam === REFEREE_SECTION_ID
    if (!shouldScroll) return

    const scrollToSection = () => {
      const el = document.getElementById(REFEREE_SECTION_ID)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    const scrollToReview = (id: string) => {
      const el = document.getElementById(`review-${id}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.setAttribute("tabIndex", "-1")
        ;(el as HTMLElement).focus({ preventScroll: true })
        el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background")
        const t = setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background")
        }, 2500)
        return () => clearTimeout(t)
      }
    }

    const t1 = setTimeout(scrollToSection, 200)
    if (reviewId) {
      const t2 = setTimeout(() => scrollToReview(reviewId), 600)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
    return () => clearTimeout(t1)
  }, [searchParams])

  return null
}
