"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import Link from "next/link"

type Props = {
  /** 공개 프로필용 handle (이메일 @ 앞부분). 없으면 링크 비노출 */
  handle: string | null
  /** 닉네임 등 클릭 가능한 트리거 영역 */
  children: React.ReactNode
  /** 트리거에 적용할 className (닉네임 스타일) */
  className?: string
}

/**
 * 닉네임 클릭 시 '회원정보보기' 박스를 띄우고, 클릭하면 /users/[handle] 로 이동.
 * handle이 없으면 링크 없이 children만 렌더.
 */
export function UserProfileLink({ handle, children, className }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return
      close()
    }
    document.addEventListener("click", handler, true)
    return () => document.removeEventListener("click", handler, true)
  }, [open, close])

  if (!handle) {
    return <span className={className}>{children}</span>
  }

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={className ?? "font-bold text-foreground/90 hover:underline cursor-pointer outline-none"}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {children}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded border border-border bg-card py-1 shadow-lg"
          role="menu"
        >
          <Link
            href={`/users/${handle}`}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/80"
            role="menuitem"
            onClick={close}
          >
            회원정보 보기
          </Link>
        </div>
      )}
    </span>
  )
}
