import Link from "next/link"
import { prisma } from "@/lib/prisma"

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
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "예정",
  LIVE: "라이브",
  FINISHED: "종료",
  CANCELLED: "취소",
}

export function AdminResultsMatchList({
  matches,
  seasonYear,
  leagueSlug,
  roundSlug,
}: Props) {
  return (
    <div className="ledger-surface border border-border overflow-hidden">
      <div className="grid grid-cols-12 gap-2 p-3 border-b border-border font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card/50">
        <div className="col-span-1">경기</div>
        <div className="col-span-5 text-center">매치업</div>
        <div className="col-span-2 text-center">스코어</div>
        <div className="col-span-2 text-center">상태</div>
        <div className="col-span-2 text-right">작업</div>
      </div>
      <div className="divide-y divide-border">
        {matches.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-xs">
            이 라운드에 등록된 경기가 없습니다.
          </div>
        ) : (
          matches.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-12 gap-2 p-3 md:p-4 items-center font-mono text-xs"
            >
              <div className="col-span-1 text-muted-foreground">{m.roundOrder}</div>
              <div className="col-span-5 text-center">
                {m.homeTeam.name} vs {m.awayTeam.name}
              </div>
              <div className="col-span-2 text-center tabular-nums">
                {m.scoreHome != null && m.scoreAway != null
                  ? `${m.scoreHome} : ${m.scoreAway}`
                  : "—"}
              </div>
              <div className="col-span-2 text-center">
                <span className="text-muted-foreground">
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <Link
                  href={`/admin/results/${m.id}/edit`}
                  className="text-[10px] uppercase tracking-wider text-primary hover:underline"
                >
                  결과 수정
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
