import { SiteNav } from "./SiteNav"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <SiteNav />
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
