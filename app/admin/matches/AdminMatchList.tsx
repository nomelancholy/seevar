import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import { AdminMatchRow } from "./AdminMatchRow"
import { AdminAddMatchForm } from "./AdminAddMatchForm"

type Match = Awaited<
  ReturnType<
    typeof prisma.match.findMany<{
      include: { homeTeam: true; awayTeam: true }
    }>
  >
>[number]

type Props = {
  matches: Match[]
  seasonYear: number
  leagueSlug: string
  roundSlug: string
  roundId: string
  teams: { id: string; name: string }[]
}

function formatDate(d: Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, "/").replace(".", "")
}
function formatTime(d: Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function AdminMatchList({
  matches,
  seasonYear,
  leagueSlug,
  roundSlug,
  roundId,
  teams,
}: Props) {
  const matchForPath = (m: Match) => ({
    roundOrder: m.roundOrder,
    round: { slug: roundSlug, league: { slug: leagueSlug, season: { year: seasonYear } } },
  })

  return (
    <div className="mt-4 ledger-surface border border-border overflow-hidden">
      <div className="grid grid-cols-12 gap-2 p-3 border-b border-border font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card/50">
        <div className="col-span-2">일시</div>
        <div className="col-span-1">경기</div>
        <div className="col-span-4 text-center">매치업</div>
        <div className="col-span-1">상태</div>
        <div className="col-span-2">경기장</div>
        <div className="col-span-2 text-right">작업</div>
      </div>
      <div className="divide-y divide-border">
        {matches.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-xs">
            이 라운드에 등록된 경기가 없습니다.
          </div>
        ) : (
          matches.map((m) => (
            <AdminMatchRow
              key={m.id}
              match={m}
              matchDetailPath={getMatchDetailPath(matchForPath(m))}
              dateStr={formatDate(m.playedAt)}
              timeStr={formatTime(m.playedAt)}
            />
          ))
        )}
      </div>
      <div className="p-4 border-t border-border">
        <AdminAddMatchForm roundId={roundId} teams={teams} nextOrder={matches.length + 1} />
      </div>
    </div>
  )
}
