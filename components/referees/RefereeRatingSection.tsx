"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { EmblemImage } from "@/components/ui/EmblemImage"

const ROLE_LABEL: Record<string, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  VAR: "VAR",
  WAITING: "대기심",
}

const roles = ["MAIN", "ASSISTANT", "VAR", "WAITING"] as const

type TeamStat = {
  teamName: string
  emblemPath: string | null
  fanAverageRating: number
  totalAssignments: number
}

type Props = {
  averageRating: number | null
  totalVotes: number
  ratingByRole: Record<string, number | undefined>
  teamStats: TeamStat[]
}

export function RefereeRatingSection({
  averageRating,
  totalVotes = 0,
  ratingByRole,
  teamStats,
}: Props) {
  const [teamRatingsOpen, setTeamRatingsOpen] = useState(false)
  const rating = averageRating ?? 0
  const isTop = rating >= 3.5
  const isLow = rating > 0 && rating < 2.5

  return (
    <div className="mt-6 md:mt-8 border-t border-border pt-4 md:pt-6">
      {/* Global Rating row + arrow (toggle 팀별 팬 평점) */}
      <button
        type="button"
        onClick={() => setTeamRatingsOpen((o) => !o)}
        className="flex items-center justify-between w-full gap-2 mb-4 group cursor-pointer text-left"
      >
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex flex-col">
            <div className="text-[8px] md:text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Global Rating
            </div>
            <div className="text-[7px] md:text-[9px] font-mono text-primary opacity-70">
              TOTAL VOTES: {totalVotes > 0 ? totalVotes.toLocaleString() : "—"}
            </div>
          </div>
          <div className="flex items-end gap-1 md:gap-2">
            <span
              className={`text-3xl md:text-4xl font-black italic ${
                isTop ? "text-primary" : isLow ? "text-destructive" : "text-foreground"
              }`}
            >
              {averageRating != null ? averageRating.toFixed(1) : "—"}
            </span>
            <span className="text-muted-foreground font-bold mb-0.5 md:mb-1 text-xs md:text-base">
              / 5.0
            </span>
          </div>
        </div>
        <div
          className={`p-1.5 md:p-2 rounded-full border border-border bg-muted/50 group-hover:bg-muted transition-transform duration-300 ${teamRatingsOpen ? "rotate-180" : ""}`}
        >
          <ChevronDown className="size-4 md:size-5 text-muted-foreground" />
        </div>
      </button>

      {/* Role-based rating cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {roles.map((role) => (
          <div
            key={role}
            className="bg-card/30 p-3 md:p-4 border border-border/50 text-center"
          >
            <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-1 md:mb-2">
              {ROLE_LABEL[role]}
            </p>
            <p className="text-2xl md:text-3xl font-black italic font-mono">
              {ratingByRole[role] != null ? `${ratingByRole[role]!.toFixed(1)}` : "—"}
            </p>
            <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">/ 5.0</p>
          </div>
        ))}
      </div>

      {/* 팀별 팬 평점 (expandable) */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 overflow-hidden transition-all duration-500 ease-in-out ${
          teamRatingsOpen ? "max-h-[800px] opacity-100 mt-4 md:mt-6 pb-4" : "max-h-0 opacity-0 mt-0"
        }`}
      >
        {teamStats.map((t) => {
          const pct = Math.min(100, (t.fanAverageRating / 5) * 100)
          const isLowTeam = t.fanAverageRating > 0 && t.fanAverageRating < 2.5
          const isHighTeam = t.fanAverageRating >= 4
          const barColor = isLowTeam ? "bg-destructive" : isHighTeam ? "bg-primary" : "bg-muted-foreground/80"
          return (
            <div
              key={t.teamName}
              className="bg-card/50 p-3 md:p-4 border border-border flex justify-between items-center"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <EmblemImage src={t.emblemPath} width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 object-contain shrink-0" />
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] md:text-xs uppercase">{t.teamName}</span>
                  <span className="font-mono text-[7px] md:text-[8px] text-muted-foreground">
                    VOTES: {t.totalAssignments.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 md:w-24 h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] md:text-[10px] font-bold min-w-[2rem] text-right">
                  {t.fanAverageRating.toFixed(1)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
