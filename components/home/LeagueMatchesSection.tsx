"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { EmblemImage } from "@/components/ui/EmblemImage"

export type FocusMatchItem = {
  id: string
  matchPath: string
  date: string
  timeStr: string
  venue: string
  homeName: string
  awayName: string
  homeEmblem: string
  awayEmblem: string
  scoreHome: number | null
  scoreAway: number | null
}

function LeagueBlock({
  leagueName,
  roundNumber,
  matches,
  open,
  onToggle,
}: {
  leagueName: string
  roundNumber: number
  matches: FocusMatchItem[]
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="league-container">
      <button
        type="button"
        className="league-header w-full flex items-center"
        onClick={onToggle}
      >
        <div className="bg-primary text-primary-foreground flex items-center px-3 md:px-4 py-1.5 md:py-2 gap-2">
          <span className="text-xl md:text-2xl font-black italic tracking-tighter">
            {roundNumber}
          </span>
          <span className="text-[8px] md:text-xs font-bold uppercase tracking-widest">
            round
          </span>
        </div>
        <div className="flex flex-1 items-center px-4 md:px-6">
          <span className="text-xs md:text-sm font-black italic tracking-widest uppercase">
            {leagueName}
          </span>
        </div>
        <div className="flex items-center px-4 md:px-6 border-l border-border">
          <ChevronDown
            className={`size-4 md:size-5 league-arrow ${open ? "open" : ""}`}
          />
        </div>
      </button>
      <div className={`league-content ${open ? "open" : ""}`}>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {matches.length === 0 ? (
            <p className="col-span-full text-muted-foreground font-mono text-xs py-6 px-4">
              등록된 경기가 없습니다.
            </p>
          ) : (
          matches.slice(0, 12).map((m) => (
            <Link
              key={m.id}
              href={m.matchPath}
              className="match-card-mini flex flex-col items-center gap-2 w-full min-w-0 p-4 md:p-5"
              title="경기 상세 보기"
            >
              <div className="text-chart-2 font-bold font-mono text-xs md:text-sm">
                {m.date}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 w-full justify-between min-w-0 flex-nowrap">
                <EmblemImage src={m.homeEmblem} width={40} height={40} className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 shrink-0" />
                {m.scoreHome != null && m.scoreAway != null ? (
                  <span className="text-sm md:text-base font-black tabular-nums whitespace-nowrap shrink-0 min-w-[3rem] text-center">
                    {m.scoreHome} : {m.scoreAway}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs shrink-0">vs</span>
                )}
                <EmblemImage src={m.awayEmblem} width={40} height={40} className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 shrink-0" />
              </div>
              <div className="text-xs md:text-sm font-mono text-center font-medium">
                {m.homeName} vs {m.awayName}
              </div>
              {(m.venue || m.timeStr) && (
                <div className="text-[10px] md:text-xs text-muted-foreground font-mono text-center">
                  {[m.venue, m.timeStr].filter(Boolean).join(" | ")}
                </div>
              )}
            </Link>
          )))}
        </div>
      </div>
    </div>
  )
}

type Props = {
  k1Matches?: FocusMatchItem[]
  k2Matches?: FocusMatchItem[]
  hasK1Focus?: boolean
  hasK2Focus?: boolean
}

export function LeagueMatchesSection({
  k1Matches = [],
  k2Matches = [],
  hasK1Focus = false,
  hasK2Focus = false,
}: Props) {
  const [k1Open, setK1Open] = useState(true)
  const [k2Open, setK2Open] = useState(true)
  if (!hasK1Focus && !hasK2Focus) return null

  return (
    <div className="mb-8 md:mb-12">
      <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
        라운드 경기 일정
      </h2>
      {hasK1Focus && (
        <LeagueBlock
          leagueName="K League 1"
          roundNumber={1}
          matches={k1Matches}
          open={k1Open}
          onToggle={() => setK1Open((o) => !o)}
        />
      )}
      {hasK2Focus && (
        <LeagueBlock
          leagueName="K League 2"
          roundNumber={1}
          matches={k2Matches}
          open={k2Open}
          onToggle={() => setK2Open((o) => !o)}
        />
      )}
    </div>
  )
}
