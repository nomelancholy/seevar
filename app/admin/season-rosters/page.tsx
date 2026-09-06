import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminSeasonRosterManager } from "./AdminSeasonRosterManager"

export const metadata = {
  title: "연도별 소속 관리 | 관리자 | SEE VAR",
  description: "시즌별 팀 리그 소속과 활동 심판 명단 관리",
}

export default async function AdminSeasonRostersPage() {
  const [seasons, teams, referees] = await Promise.all([
    prisma.season.findMany({
      orderBy: { year: "desc" },
      include: {
        leagues: {
          orderBy: { slug: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            teams: { select: { id: true }, orderBy: { name: "asc" } },
          },
        },
        refereeSeasons: { select: { refereeId: true } },
      },
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, emblemPath: true },
    }),
    prisma.referee.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ])

  const seasonData = seasons.map((season) => ({
    id: season.id,
    year: season.year,
    leagues: season.leagues.map((league) => ({
      id: league.id,
      name: league.name,
      slug: league.slug,
      teamIds: league.teams.map((team) => team.id),
    })),
    refereeIds: season.refereeSeasons.map((membership) => membership.refereeId),
  }))

  return (
    <main className="max-w-5xl mx-auto pb-12 md:pb-16">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 관리자
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
          연도별 소속 관리
        </h2>
        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          팀 기본 정보와 심판 기본 정보는 유지한 채, 시즌마다 팀의 리그 소속과 활동 심판 명단만 바꿉니다.
          승강이 있어도 과거 경기·평점·심판 배정 기록은 변경되지 않습니다.
        </p>
      </div>

      {seasonData.length === 0 ? (
        <div className="ledger-surface border border-border p-6 font-mono text-xs text-muted-foreground">
          먼저 <Link href="/admin/structure" className="text-primary hover:underline">시즌·리그·라운드 관리</Link>에서 시즌과 리그를 추가하세요.
        </div>
      ) : (
        <AdminSeasonRosterManager
          seasons={seasonData}
          teams={teams}
          referees={referees}
        />
      )}
    </main>
  )
}
