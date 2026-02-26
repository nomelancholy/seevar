"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { EmblemImage } from "@/components/ui/EmblemImage"

type TeamStat = {
  teamName: string
  emblemPath: string | null
  fanAverageRating: number
  totalAssignments: number
}

type Props = { teamStats: TeamStat[] }

export function RefereeTeamRatingsExpand({ teamStats }: Props) {
  const [open, setOpen] = useState(false)
  if (teamStats.length === 0) return null
  return (
    <div className="mt-4 md:mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full gap-2 text-left font-mono text-[10px] md:text-xs text-muted-foreground hover:text-foreground uppercase tracking-widest"
      >
        <span>팀별 팬 평점</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 overflow-hidden transition-all duration-300 ${
          open ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
        }`}
      >
        {teamStats.map((t) => (
          <div
            key={t.teamName}
            className="bg-muted/50 p-3 md:p-4 border border-border flex justify-between items-center"
          >
            <div className="flex items-center gap-2 md:gap-3">
              <EmblemImage src={t.emblemPath} width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
              <div className="flex flex-col">
                <span className="font-mono text-[10px] md:text-xs uppercase">{t.teamName}</span>
                <span className="font-mono text-[8px] md:text-[9px] text-muted-foreground">
                  VOTES: {t.totalAssignments.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 md:w-24 h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, (t.fanAverageRating / 5) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-[10px] md:text-xs font-bold">
                {t.fanAverageRating.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
