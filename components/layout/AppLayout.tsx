import type { User } from "@prisma/client"
import { RedirectToOnboardingIfNeeded } from "@/components/auth/RedirectToOnboardingIfNeeded"
import { SiteNav } from "./SiteNav"

type LayoutUser = Pick<User, "id" | "name" | "email" | "image"> & {
  supportingTeam: { id: string; name: string; emblemPath: string | null } | null
}

export function AppLayout({
  children,
  user,
  unreadNotificationCount = 0,
}: {
  children: React.ReactNode
  user: LayoutUser | null
  unreadNotificationCount?: number
}) {
  return (
    <div className="min-h-screen p-4 md:p-8 md:px-12 lg:px-16">
      <RedirectToOnboardingIfNeeded user={user} />
      <SiteNav user={user} unreadNotificationCount={unreadNotificationCount} />
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
