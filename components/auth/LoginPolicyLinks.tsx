"use client"

import Link from "next/link"

export function LoginPolicyLinks() {
  return (
    <p className="text-xs md:text-sm font-mono text-muted-foreground mt-6 text-center leading-relaxed">
      이용 약관 및 개인정보 처리 방침에 동의하는 것으로 간주됩니다.{" "}
      <Link
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        이용약관
      </Link>
      {" · "}
      <Link
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        개인정보 처리 방침
      </Link>
    </p>
  )
}
