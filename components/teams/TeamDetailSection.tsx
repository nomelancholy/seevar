import Link from "next/link"
import { deriveMatchStatus } from "@/lib/utils/match-status"

const ROLE_LABEL: Record<string, string> = {
  MAIN: "MAIN",
  ASSISTANT: "ASST",
  VAR: "VAR",
  WAITING: "4TH",
}

type RefereeStat = {
  id: string
  slug: string
  name: string
  fanAverageRating: number
  totalAssignments: number
  roleCounts: Record<string, number> | null
}

type MatchRow = {
  id: string
  matchPath: string
  playedAt: Date | null
  status: string
  scoreHome: number | null
  scoreAway: number | null
  homeTeam: { id: string; name: string; emblemPath: string | null }
  awayTeam: { id: string; name: string; emblemPath: string | null }
  matchReferees: { role: string; referee: { id: string; slug: string; name: string } }[]
}

type Props = {
  teamName: string
  teamId: string
  compatibility: { high: RefereeStat | null; low: RefereeStat | null }
  assignments: RefereeStat[]
  matches: MatchRow[]
}

function roleCountDisplay(roleCounts: Record<string, number> | null): string {
  if (!roleCounts || typeof roleCounts !== "object") return "—"
  const labels = ["MAIN", "ASSISTANT", "VAR", "WAITING"] as const
  return labels
    .filter((r) => roleCounts[r] != null)
    .map((r) => `${ROLE_LABEL[r] ?? r}: ${roleCounts[r]}`)
    .join(", ") || "—"
}

function getRoleCount(roleCounts: Record<string, number> | null, role: string): number {
  if (!roleCounts || typeof roleCounts !== "object") return 0
  return Number(roleCounts[role]) || 0
}

export function TeamDetailSection({
  teamName,
  teamId,
  compatibility,
  assignments,
  matches,
}: Props) {
  const formatDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).replace(/\. /g, "/").replace(".", "")
      : "—"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
      {/* LEFT: REFEREE COMPATIBILITY & FREQUENT ASSIGNMENTS */}
      <div className="lg:col-span-4 space-y-6 md:space-y-8">
        {/* Referee Compatibility (Fan Choice) */}
        <div className="ledger-surface p-4 md:p-6 border border-border">
          <h3 className="font-mono text-[10px] md:text-xs font-black tracking-widest text-primary uppercase italic mb-6 md:mb-8">
            Referee Compatibility (Fan Choice)
          </h3>
          <div className="space-y-6 md:space-y-8">
            <div>
              <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase mb-3 md:mb-4">
                High Compatibility
              </p>
              {compatibility.high ? (
                <div className="bg-card/50 border border-border p-3 md:p-4 flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-muted flex items-center justify-center shrink-0">
                    <span className="text-muted-foreground text-lg font-black">👤</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/referees/${compatibility.high.slug}`}
                      className="text-base md:text-lg font-black italic uppercase leading-none mb-1 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {compatibility.high.name}
                      <span className="text-[10px]">→</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <div className="w-16 md:w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-1 max-w-[80px]">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, (compatibility.high.fanAverageRating / 5) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] md:text-xs font-bold text-primary">
                        {compatibility.high.fanAverageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] text-muted-foreground py-2">—</p>
              )}
            </div>
            <div>
              <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase mb-3 md:mb-4">
                Low Compatibility
              </p>
              {compatibility.low ? (
                <div className="bg-card/50 border border-border p-3 md:p-4 flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-muted flex items-center justify-center shrink-0">
                    <span className="text-muted-foreground text-lg font-black">👤</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/referees/${compatibility.low.slug}`}
                      className="text-base md:text-lg font-black italic uppercase leading-none mb-1 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {compatibility.low.name}
                      <span className="text-[10px]">→</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <div className="w-16 md:w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-1 max-w-[80px]">
                        <div
                          className="h-full bg-destructive"
                          style={{ width: `${Math.min(100, (compatibility.low.fanAverageRating / 5) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] md:text-xs font-bold text-destructive">
                        {compatibility.low.fanAverageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] text-muted-foreground py-2">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Frequent Assignments */}
        <div className="ledger-surface p-4 md:p-6 border border-border">
          <h3 className="font-mono text-[10px] md:text-xs font-black tracking-widest text-primary uppercase italic mb-6 md:mb-8">
            Frequent Assignments
          </h3>
          <div className="space-y-2">
            {assignments.length === 0 ? (
              <p className="font-mono text-[10px] text-muted-foreground py-2">해당 팀 경기 배정 데이터가 없습니다.</p>
            ) : (
              assignments.slice(0, 5).map((ref, idx) => (
                <div
                  key={ref.id}
                  className={`flex items-center justify-between bg-card/30 p-2.5 md:p-3 border-l-2 ${
                    idx === 0 ? "border-primary" : "border-border"
                  }`}
                >
                  <Link
                    href={`/referees/${ref.slug}`}
                    className="text-[10px] md:text-xs font-bold italic uppercase hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {idx + 1}. {ref.name}
                    <span className="text-[8px]">→</span>
                  </Link>
                  <span className="font-mono text-[9px] md:text-[10px] text-muted-foreground">
                    {ref.totalAssignments} Matches
                  </span>
                </div>
              ))
            )}
          </div>
          {assignments.length > 0 && (
            <p className="font-mono text-[9px] text-muted-foreground mt-2">
              {roleCountDisplay(assignments[0]?.roleCounts ?? null)}
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: MATCH HISTORY */}
      <div className="lg:col-span-8 ledger-surface p-4 md:p-6 border border-border">
        <h3 className="font-mono text-[10px] md:text-sm font-black tracking-widest text-muted-foreground mb-6 md:mb-8 uppercase">
          {teamName} Match History
        </h3>
        <div className="space-y-4">
          {matches.length === 0 ? (
            <p className="font-mono text-[10px] text-muted-foreground py-4">등록된 경기가 없습니다.</p>
          ) : (
            matches.map((m) => (
              <div
                key={m.id}
                className="flex flex-col p-4 md:p-6 border border-border hover:border-muted-foreground/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                    <div className="font-mono text-xs md:text-sm text-muted-foreground">{formatDate(m.playedAt)}</div>
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        {m.homeTeam.emblemPath && (
                          <img src={m.homeTeam.emblemPath} alt="" className="w-6 h-6 md:w-8 md:h-8" />
                        )}
                        <span className="font-black italic text-base md:text-xl uppercase">{m.homeTeam.name}</span>
                      </div>
                      <span className="text-2xl md:text-4xl font-black italic tracking-tighter">
                        {(() => {
                          const status = deriveMatchStatus(m.playedAt, { storedStatus: m.status })
                          return status === "LIVE" && m.scoreHome != null && m.scoreAway != null
                            ? `${m.scoreHome} : ${m.scoreAway}`
                            : status === "FINISHED" && m.scoreHome != null && m.scoreAway != null
                              ? `${m.scoreHome} : ${m.scoreAway}`
                              : "VS"
                        })()}
                      </span>
                      <div className="flex items-center gap-2 md:gap-3">
                        {m.awayTeam.emblemPath && (
                          <img src={m.awayTeam.emblemPath} alt="" className="w-6 h-6 md:w-8 md:h-8" />
                        )}
                        <span className="font-black italic text-base md:text-xl uppercase text-muted-foreground">
                          {m.awayTeam.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={m.matchPath}
                    className="border border-border px-3 md:px-4 py-1.5 md:py-2 text-[8px] md:text-[10px] font-bold font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-all inline-flex items-center gap-2 w-fit"
                  >
                    INSIDE GAME →
                  </Link>
                </div>
                {m.matchReferees.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 pt-4 border-t border-border">
                    {m.matchReferees.map((mr) => (
                      <div key={mr.referee.id + mr.role} className="flex flex-col">
                        <span className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase mb-1">
                          {ROLE_LABEL[mr.role] ?? mr.role}
                        </span>
                        <Link
                          href={`/referees/${mr.referee.slug}`}
                          className="font-mono text-[10px] md:text-xs font-bold hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {mr.referee.name}
                          <span className="text-[8px]">→</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
