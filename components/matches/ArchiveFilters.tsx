"use client"

import { useRouter } from "next/navigation"

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
    <div className="flex flex-wrap gap-3 md:gap-4">
      <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
        <label className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase">
          Season
        </label>
        <select
          value={currentYear}
          onChange={(e) => updateSeason(Number(e.target.value))}
          className="bg-card border border-border px-3 md:px-4 py-2 pr-8 md:pr-10 text-[10px] md:text-xs font-mono focus:outline-none focus:border-primary w-full"
        >
          {seasons.map((s) => (
            <option key={s.year} value={s.year}>
              {s.name} SEASON
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
        <label className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase">
          League
        </label>
        <select
          value={leagueValue}
          onChange={(e) => updateLeague(e.target.value)}
          disabled={leagues.length === 0}
          className="bg-card border border-border px-3 md:px-4 py-2 pr-8 md:pr-10 text-[10px] md:text-xs font-mono focus:outline-none focus:border-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
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
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
        <label className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase">
          Round
        </label>
        <select
          value={roundValue}
          onChange={(e) => updateRound(e.target.value)}
          disabled={rounds.length === 0}
          className="bg-card border border-border px-3 md:px-4 py-2 pr-8 md:pr-10 text-[10px] md:text-xs font-mono focus:outline-none focus:border-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
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
      </div>
    </div>
  )
}
