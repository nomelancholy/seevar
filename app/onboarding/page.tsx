import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OnboardingForm } from "./OnboardingForm"

export const metadata = {
  title: "Onboarding | See VAR",
  description: "프로필 정보를 완성하고 시작하세요.",
}

type TeamForOnboarding = { id: string; name: string; emblemPath: string | null }

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.supportingTeamId) redirect("/")

  const rows = await prisma.team.findMany({ orderBy: { name: "asc" } })
  const teams: TeamForOnboarding[] = rows.map((t) => {
    const row = t as { id: string; name: string; emblemPath?: string | null; emblem?: string | null }
    return {
      id: row.id,
      name: row.name,
      emblemPath: row.emblemPath ?? row.emblem ?? null,
    }
  })

  return (
    <div className="min-h-[80vh] flex flex-col p-4 md:p-8 max-w-[900px] mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          BACK
        </Link>
      </div>

      <div className="flex-1 rounded-md border border-border bg-card p-6 md:p-12 shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
        <header className="mb-8 md:mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-2">
            Almost There
          </h1>
          <p className="font-mono text-[8px] md:text-[10px] text-muted-foreground">
            프로필 정보를 완성하고 시작하세요.
          </p>
        </header>

        <OnboardingForm teams={teams} />
      </div>
    </div>
  )
}
