"use client"

import { useState } from "react"
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
  "relative w-full bg-card border border-border rounded-md pl-3 md:pl-4 pr-9 py-2.5 md:py-3 text-xs md:text-sm font-mono text-foreground " +
  "cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/20 " +
  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary " +
  "transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-card text-left"

export function ArchiveFilters({
  seasons,
  leagues,
  rounds,
  currentYear,
  currentLeagueSlug,
  currentRoundSlug,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<"season" | "league" | "round" | null>(null)

  function updateSeason(year: number) {
    const y = String(year)
    // 시즌 변경 시에는 현재 리그/라운드를 유지하고,
    // 존재하지 않을 경우 서버 쪽 redirect 로직이 유효한 리그/라운드로 보내도록 맡긴다.
    router.push(`/matches/archive/${y}/${currentLeagueSlug}/${currentRoundSlug}`)
  }

  function updateLeague(leagueSlug: string) {
    if (!leagueSlug) return
    // 리그 변경 시에는 현재 라운드를 유지하고,
    // 해당 리그에 라운드가 없거나 roundSlug 가 없으면 서버가 첫 라운드로 redirect 한다.
    router.push(`/matches/archive/${currentYear}/${leagueSlug}/${currentRoundSlug}`)
  }

  function updateRound(roundSlug: string) {
    if (!roundSlug) return
    router.push(`/matches/archive/${currentYear}/${currentLeagueSlug}/${roundSlug}`)
  }

  // URL slug가 옵션과 대소문자 등으로 다를 수 있으므로, 옵션 목록에서 매칭되는 값 사용
  const leagueValue = leagues.length
    ? (leagues.find((l) => l.slug.toLowerCase() === currentLeagueSlug.toLowerCase())?.slug ?? currentLeagueSlug)
    : ""
  const roundValue = rounds.length
    ? (rounds.find((r) => r.slug === currentRoundSlug)?.slug ?? currentRoundSlug)
    : ""

  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-wrap gap-4 md:gap-6">
        {/* 시즌 */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[100px] md:min-w-[120px]">
          <label className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
            시즌
          </label>
          <div className="relative">
            <button
              type="button"
              className={selectBase}
              onClick={() => setOpen(open === "season" ? null : "season")}
            >
              <span>{currentYear} 시즌</span>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
            </button>
            {open === "season" && (
              <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-xl">
                {seasons.map((s) => (
                  <button
                    key={s.year}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-xs md:text-sm font-mono hover:bg-muted ${
                      s.year === currentYear ? "bg-muted/70 text-primary" : "text-foreground"
                    }`}
                    onClick={() => {
                      setOpen(null)
                      if (s.year !== currentYear) updateSeason(s.year)
                    }}
                  >
                    {s.name} 시즌
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 리그 */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[100px] md:min-w-[120px]">
          <label className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
            리그
          </label>
          <div className="relative">
            <button
              type="button"
              className={selectBase}
              onClick={() => setOpen(open === "league" ? null : "league")}
              disabled={leagues.length === 0}
            >
              <span>
                {leagues.length === 0
                  ? "—"
                  : (leagues.find((l) => l.slug === leagueValue)?.name ?? leagueValue).toUpperCase()}
              </span>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
            </button>
            {open === "league" && leagues.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-xl">
                {leagues.map((l) => (
                  <button
                    key={l.slug}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-xs md:text-sm font-mono hover:bg-muted ${
                      l.slug === leagueValue ? "bg-muted/70 text-primary" : "text-foreground"
                    }`}
                    onClick={() => {
                      setOpen(null)
                      if (l.slug !== leagueValue) updateLeague(l.slug)
                    }}
                  >
                    {l.name.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 라운드 */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[100px] md:min-w-[120px]">
          <label className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
            라운드
          </label>
          <div className="relative">
            <button
              type="button"
              className={selectBase}
              onClick={() => setOpen(open === "round" ? null : "round")}
              disabled={rounds.length === 0}
            >
              <span>
                {rounds.length === 0
                  ? "—"
                  : `ROUND ${rounds.find((r) => r.slug === roundValue)?.number ?? currentRoundSlug}`}
              </span>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
            </button>
            {open === "round" && rounds.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-xl">
                {rounds.map((r) => (
                  <button
                    key={r.slug}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-xs md:text-sm font-mono hover:bg-muted ${
                      r.slug === roundValue ? "bg-muted/70 text-primary" : "text-foreground"
                    }`}
                    onClick={() => {
                      setOpen(null)
                      if (r.slug !== roundValue) updateRound(r.slug)
                    }}
                  >
                    ROUND {r.number}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
