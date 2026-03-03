"use client"

import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"

type Season = { year: number; name: string }
type League = { slug: string; name: string }
type Round = { slug: string; number: number }

type Props = {
  seasons: Season[]
  leagues: League[]
  rounds: Round[]
  currentYear: number
  currentLeagueSlug: string
  currentRoundSlug: string
}

const selectBase =
  "w-full bg-card border border-border rounded-md pl-3 md:pl-4 pr-9 py-2.5 md:py-3 text-xs md:text-sm font-mono text-foreground " +
  "appearance-none cursor-pointer " +
  "hover:border-muted-foreground/50 hover:bg-muted/20 " +
  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary " +
  "transition-colors duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-card"

export function ArchiveFilters({
  seasons,
  leagues,
  rounds,
  currentYear,
  currentLeagueSlug,
  currentRoundSlug,
}: Props) {
  const router = useRouter()

  function updateSeason(year: number) {
    const y = String(year)
    const l = leagues[0]?.slug ?? currentLeagueSlug
    const r = l ? (rounds[0]?.slug ?? "round-1") : currentRoundSlug
    router.push(`/matches/archive/${y}/${l}/${r}`)
  }

  function updateLeague(leagueSlug: string) {
    if (!leagueSlug) return
    const r = rounds[0]?.slug ?? "round-1"
    router.push(`/matches/archive/${currentYear}/${leagueSlug}/${r}`)
  }

  function updateRound(roundSlug: string) {
    if (!roundSlug) return
    router.push(`/matches/archive/${currentYear}/${currentLeagueSlug}/${roundSlug}`)
  }

  const leagueValue = leagues.length ? currentLeagueSlug : ""
  const roundValue = rounds.length ? currentRoundSlug : ""

  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-wrap gap-4 md:gap-6">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[100px] md:min-w-[120px]">
          <label className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
            시즌
          </label>
          <div className="relative">
            <select
              value={currentYear}
              onChange={(e) => updateSeason(Number(e.target.value))}
              className={selectBase}
              aria-label="시즌 선택"
            >
              {seasons.map((s) => (
                <option key={s.year} value={s.year}>
                  {s.name} 시즌
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[100px] md:min-w-[120px]">
          <label className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
            리그
          </label>
          <div className="relative">
            <select
              value={leagueValue}
              onChange={(e) => updateLeague(e.target.value)}
              disabled={leagues.length === 0}
              className={selectBase}
              aria-label="리그 선택"
            >
              {leagues.length === 0 ? (
                <option value="">—</option>
              ) : (
                leagues.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name.toUpperCase()}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[100px] md:min-w-[120px]">
          <label className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
            라운드
          </label>
          <div className="relative">
            <select
              value={roundValue}
              onChange={(e) => updateRound(e.target.value)}
              disabled={rounds.length === 0}
              className={selectBase}
              aria-label="라운드 선택"
            >
              {rounds.length === 0 ? (
                <option value="">—</option>
              ) : (
                rounds.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    ROUND {r.number}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  )
}
