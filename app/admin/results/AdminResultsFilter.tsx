"use client"

import { useRouter } from "next/navigation"

type Props = {
  seasons: { id: string; year: number }[]
  leagues: { id: string; name: string; slug: string }[]
  rounds: { id: string; number: number; slug: string }[]
  currentYear: number
  currentLeagueSlug: string
  currentRoundSlug: string
  baseUrl: string
}

export function AdminResultsFilter({
  seasons,
  leagues,
  rounds,
  currentYear,
  currentLeagueSlug,
  currentRoundSlug,
  baseUrl,
}: Props) {
  const router = useRouter()

  function onYearChange(year: string) {
    router.push(`${baseUrl}?year=${year}`)
  }
  function onLeagueChange(league: string) {
    router.push(`${baseUrl}?year=${currentYear}&league=${league}`)
  }
  function onRoundChange(round: string) {
    router.push(`${baseUrl}?year=${currentYear}&league=${currentLeagueSlug}&round=${round}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-xs mb-6">
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">시즌</span>
        <select
          value={currentYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="bg-card border border-border px-2 py-1.5 focus:border-primary outline-none"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.year}>
              {s.year}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">리그</span>
        <select
          value={currentLeagueSlug}
          onChange={(e) => onLeagueChange(e.target.value)}
          className="bg-card border border-border px-2 py-1.5 focus:border-primary outline-none"
        >
          {leagues.map((l) => (
            <option key={l.id} value={l.slug}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">라운드</span>
        <select
          value={currentRoundSlug}
          onChange={(e) => onRoundChange(e.target.value)}
          className="bg-card border border-border px-2 py-1.5 focus:border-primary outline-none"
        >
          {rounds.map((r) => (
            <option key={r.id} value={r.slug}>
              {r.slug}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
