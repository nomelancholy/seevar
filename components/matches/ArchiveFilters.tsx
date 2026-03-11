"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronDown, Loader2 } from "lucide-react"

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
  const pathname = usePathname()
  const [open, setOpen] = useState<"season" | "league" | "round" | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const pathWhenStartedRef = useRef(pathname)

  useEffect(() => {
    if (isNavigating && pathname !== pathWhenStartedRef.current) {
      pathWhenStartedRef.current = pathname
      setIsNavigating(false)
    }
  }, [pathname, isNavigating])

  function updateSeason(year: number) {
    const y = String(year)
    pathWhenStartedRef.current = pathname
    setIsNavigating(true)
    setOpen(null)
    router.push(`/matches/archive/${y}/${currentLeagueSlug}/${currentRoundSlug}`)
  }

  function updateLeague(leagueSlug: string) {
    if (!leagueSlug) return
    pathWhenStartedRef.current = pathname
    setIsNavigating(true)
    setOpen(null)
    router.push(`/matches/archive/${currentYear}/${leagueSlug}/${currentRoundSlug}`)
  }

  function updateRound(roundSlug: string) {
    if (!roundSlug) return
    pathWhenStartedRef.current = pathname
    setIsNavigating(true)
    setOpen(null)
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
    <>
      {isNavigating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
          role="status"
        >
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-5 shadow-xl">
            <Loader2 className="size-8 animate-spin shrink-0 text-primary" aria-hidden />
            <span className="font-mono text-sm text-foreground">경기 기록 불러오는 중...</span>
          </div>
        </div>
      )}
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
              disabled={isNavigating}
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
              disabled={leagues.length === 0 || isNavigating}
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
              disabled={rounds.length === 0 || isNavigating}
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
    </>
  )
}
