"use client"

import { useRouter } from "next/navigation"

type Props = {
  /** 히스토리가 없을 때 이동할 URL (기본: /referees) */
  fallbackHref?: string
  className?: string
}

/** 뒤로 가기: 가능하면 브라우저 이전 페이지로, 아니면 fallbackHref로 */
export function RefereeDetailBackLink({
  fallbackHref = "/referees",
  className,
}: Props) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  const baseClass =
    "flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors " +
    (className ?? "")

  return (
    <button type="button" onClick={handleBack} className={baseClass}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      뒤로 가기
    </button>
  )
}
