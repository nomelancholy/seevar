"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

type User = {
  supportingTeam: { id: string } | null
}

function isAllowedWithoutTeam(pathname: string): boolean {
  if (pathname === "/login") return true
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) return true
  return false
}

export function RedirectToOnboardingIfNeeded({ user }: { user: User | null }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    if (user.supportingTeam) return
    if (isAllowedWithoutTeam(pathname)) return

    router.replace("/onboarding")
  }, [user, pathname, router])

  return null
}
