"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

const NAVER_GREEN = "#03C75A"

export function LoginNaverButton() {
  const [loading, setLoading] = useState(false)

  async function handleNaverLogin() {
    setLoading(true)
    try {
      await signIn("naver", { callbackUrl: "/onboarding" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleNaverLogin}
      disabled={loading}
      className="flex items-center justify-center gap-3 w-full text-white font-black text-sm py-3 md:py-4 rounded-md hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-70 disabled:pointer-events-none"
      style={{ backgroundColor: NAVER_GREEN }}
    >
      <svg
        className="size-4 md:size-5 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
      </svg>
      {loading ? "로그인 중..." : "NAVER LOGIN"}
    </button>
  )
}
