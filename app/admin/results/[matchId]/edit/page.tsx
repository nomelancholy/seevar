import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminResultEditForm } from "./AdminResultEditForm"

export const metadata = {
  title: "경기 결과 수정 | 관리자 | See VAR",
}

type Params = Promise<{ matchId: string }>

export default async function AdminResultEditPage({ params }: { params: Params }) {
  const { matchId } = await params
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      round: { include: { league: { include: { season: true } } } },
    },
  })
  if (!match) notFound()

  return (
    <main className="max-w-2xl mx-auto pb-12">
      <div className="mb-6">
        <Link
          href="/admin/results"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 경기 결과 목록
        </Link>
      </div>
      <h2 className="text-xl font-black uppercase tracking-tighter mb-2">경기 결과 수정</h2>
      <p className="font-mono text-xs text-muted-foreground mb-4">
        {match.homeTeam.name} vs {match.awayTeam.name} · {match.round.league.season.year}{" "}
        {match.round.league.name} {match.round.slug}
      </p>
      <AdminResultEditForm
        matchId={match.id}
        initialStatus={match.status}
        initialScoreHome={match.scoreHome ?? null}
        initialScoreAway={match.scoreAway ?? null}
        initialFirstHalfExtraTime={match.firstHalfExtraTime ?? null}
        initialSecondHalfExtraTime={match.secondHalfExtraTime ?? null}
        initialExtraFirstHalfExtraTime={match.extraFirstHalfExtraTime ?? null}
        initialExtraSecondHalfExtraTime={match.extraSecondHalfExtraTime ?? null}
      />
    </main>
  )
}
