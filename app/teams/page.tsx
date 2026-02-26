import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { EmblemImage } from "@/components/ui/EmblemImage"

export const metadata = {
  title: "TEAM ANALYSIS | See VAR",
  description: "팀별 경기 데이터와 심판 상성 데이터",
}

/** URL 쿼리/경로용: slug의 _ 를 - 로 (e.g. kleague1_incheon_united_fc → kleague1-incheon-united-fc) */
function slugToParam(slug: string | null): string {
  return slug ? slug.replace(/_/g, "-") : ""
}

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { leagues: true },
  })

  return (
    <main className="py-8 md:py-12">
      <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
          TEAM ANALYSIS
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
          팀별 경기 데이터와 심판 상성 데이터를 확인하세요.
        </p>
      </header>

      <div className="ledger-surface p-4 md:p-8 mb-8 md:mb-12 border border-border">
        <h3 className="font-mono text-[10px] md:text-sm font-black tracking-widest text-muted-foreground uppercase mb-6 md:mb-8">
          Select Team
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {teams.map((t) => {
            const teamPath = t.slug ? slugToParam(t.slug) : t.id
            return (
              <Link
                key={t.id}
                href={`/teams/${teamPath}`}
                className="team-btn flex flex-col items-center gap-2 group border rounded-md p-3 transition-all duration-300 hover:-translate-y-0.5 opacity-60 hover:opacity-100 border-border hover:border-primary"
              >
                <div className="w-16 h-16 bg-card border border-border flex items-center justify-center overflow-hidden rounded">
                  {t.emblemPath ? (
                    <EmblemImage src={t.emblemPath} width={48} height={48} className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>
                <span className="font-mono text-xs font-bold text-center leading-tight">{t.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {teams.length === 0 && (
        <p className="font-mono text-muted-foreground">등록된 팀이 없습니다.</p>
      )}
    </main>
  )
}
