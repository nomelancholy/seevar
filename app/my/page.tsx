import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MyInformationForm } from "@/components/my/MyInformationForm"
import { MyInformationDangerZone } from "@/components/my/MyInformationDangerZone"

export const metadata = {
  title: "My Information | See VAR",
  description: "내 프로필 정보를 관리하세요.",
}

export default async function MyInformationPage() {
  const user = await getCurrentUser()
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, emblemPath: true },
  })

  return (
    <main className="py-8 md:py-12 max-w-2xl mx-auto">
      <div className="mb-6 md:mb-12">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
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
          BACK
        </Link>
      </div>

      <header className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
          MY INFORMATION
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
          내 프로필 정보를 관리하세요.
        </p>
      </header>

      {user ? (
        <>
          <section className="ledger-surface p-6 md:p-8">
            <MyInformationForm
              initialName={user.name}
              initialImage={user.image}
              initialSupportingTeamId={user.supportingTeamId}
              teams={teams}
              linkedAccountLabel="NAVER SOCIAL LOGIN"
              linkedAccountId={user.email ?? user.id.slice(0, 12)}
            />
          </section>

          <section className="mt-8 md:mt-12">
            <MyInformationDangerZone />
          </section>
        </>
      ) : (
        <section className="ledger-surface p-6 md:p-8">
          <p className="text-muted-foreground mb-6">
            로그인이 필요합니다. 프로필을 수정하려면 먼저 로그인하세요.
          </p>
          <Link
            href="/login"
            className="inline-block border border-primary bg-primary/10 text-primary px-6 py-2.5 text-[10px] md:text-xs font-black italic font-mono hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            LOGIN
          </Link>
        </section>
      )}
    </main>
  )
}
