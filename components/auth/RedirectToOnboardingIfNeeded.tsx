"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

type User = {
  supportingTeam: { id: string } | null
}

function isAllowedWithoutTeam(pathname: string): boolean {
  if (pathname === "/login") return true
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) return true
  if (pathname.startsWith("/admin")) return true
  if (pathname.startsWith("/notice")) return true
  return false
}

export function RedirectToOnboardingIfNeeded({
  user,
  isAdmin = false,
}: {
  user: User | null
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    if (user.supportingTeam) return
    if (isAdmin) return
    if (isAllowedWithoutTeam(pathname)) return

    router.replace("/onboarding")
  }, [user, isAdmin, pathname, router])

  return null
}
