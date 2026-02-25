"use client"

import Link from "next/link"

const DEFAULT_BACK = "/matches"

type Props = {
  backHref?: string | null
  className?: string
}

/** back이 없거나 기본값이면 브라우저 이전 페이지로, 있으면 back URL로 */
export function MatchDetailBackLink({ backHref, className }: Props) {
  const href = backHref ?? DEFAULT_BACK
  const useHistoryBack = href === DEFAULT_BACK

  const baseClass =
    "flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors " +
    (className ?? "")

  const handleBack = () => {
    try {
      if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back()
      } else {
        window.location.href = href
      }
    } catch {
      window.location.href = href
    }
  }

  if (useHistoryBack) {
    return (
      <button type="button" onClick={handleBack} className={baseClass}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        BACK
      </button>
    )
  }

  return (
    <Link href={href} className={baseClass}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      BACK
    </Link>
  )
}
