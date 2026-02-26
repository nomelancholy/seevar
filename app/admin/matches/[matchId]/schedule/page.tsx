import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminMatchScheduleEditForm } from "./AdminMatchScheduleEditForm"
import { AdminMatchRefereesSection } from "./AdminMatchRefereesSection"

export const metadata = {
  title: "경기 수정 | 관리자 | See VAR",
}

type Params = Promise<{ matchId: string }>

export default async function AdminMatchScheduleEditPage({ params }: { params: Params }) {
  const { matchId } = await params
  const [match, allReferees] = await Promise.all([
    prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        round: { include: { league: { include: { season: true } } } },
        matchReferees: { include: { referee: true }, orderBy: { role: "asc" } },
      },
    }),
    prisma.referee.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ])
  if (!match) notFound()

  const playedAt = match.playedAt ? new Date(match.playedAt) : null
  const dateStr = playedAt
    ? playedAt.toISOString().slice(0, 10)
    : ""
  const timeStr = playedAt
    ? `${String(playedAt.getHours()).padStart(2, "0")}:${String(playedAt.getMinutes()).padStart(2, "0")}`
    : ""

  return (
    <main className="max-w-2xl mx-auto pb-12">
      <div className="mb-6">
        <Link
          href="/admin/matches"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 경기 일정 목록
        </Link>
      </div>
      <h2 className="text-xl font-black uppercase tracking-tighter mb-2">경기 수정</h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        {match.homeTeam.name} vs {match.awayTeam.name} · {match.round.league.season.year}{" "}
        {match.round.league.name} {match.round.slug}
      </p>

      <section className="mb-10">
        <h3 className="font-mono text-sm font-bold uppercase text-muted-foreground tracking-widest mb-3">
          일정 수정
        </h3>
        <AdminMatchScheduleEditForm
          matchId={match.id}
          initialDate={dateStr}
          initialTime={timeStr}
          initialVenue={match.venue ?? ""}
          initialStatus={match.status}
        />
      </section>

      <section>
        <AdminMatchRefereesSection
          matchId={match.id}
          matchReferees={match.matchReferees}
          allReferees={allReferees}
        />
      </section>
    </main>
  )
}
