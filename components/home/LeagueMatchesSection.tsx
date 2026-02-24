"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

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
        <div className="match-slider-container">
          {matches.map((m, i) => (
            <Link
              key={m.id}
              href={m.matchPath}
              className="match-card-mini flex flex-col items-center gap-2"
              title="경기 상세 보기"
            >
              <div className="text-chart-2 font-bold font-mono text-[10px] md:text-xs">
                {m.date}
              </div>
              <div className="flex items-center gap-3 md:gap-4 w-full justify-between">
                <img src={m.homeEmblem} alt="" className="w-6 h-6 md:w-8 md:h-8" />
                <span className="text-muted-foreground text-[10px]">vs</span>
                <img src={m.awayEmblem} alt="" className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="text-[10px] font-mono text-center">
                {m.homeName} vs {m.awayName}
              </div>
              {(m.venue || m.timeStr) && (
                <div className="text-[8px] md:text-[10px] text-muted-foreground font-mono text-center">
                  {[m.venue, m.timeStr].filter(Boolean).join(" | ")}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

type Props = {
  k1Matches?: FocusMatchItem[]
  k2Matches?: FocusMatchItem[]
}

export function LeagueMatchesSection({ k1Matches = [], k2Matches = [] }: Props) {
  const [k1Open, setK1Open] = useState(true)
  const [k2Open, setK2Open] = useState(true)
  const hasK1 = k1Matches.length > 0
  const hasK2 = k2Matches.length > 0
  if (!hasK1 && !hasK2) return null

  return (
    <div className="mb-8 md:mb-12">
      <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
        Focus Round
      </h2>
      {hasK1 && (
        <LeagueBlock
          leagueName="K League 1"
          roundNumber={1}
          matches={k1Matches}
          open={k1Open}
          onToggle={() => setK1Open((o) => !o)}
        />
      )}
      {hasK2 && (
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
