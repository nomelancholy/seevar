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
  const navigatingToRef = useRef<string | null>(null)
  /** 목표 (year, league, round) — path 문자열 비교가 실패할 때(대소문자 등) 세그먼트로 비교 */
  const navigatingToSegmentsRef = useRef<{
    year: string
    leagueSlug: string
    roundSlug: string
  } | null>(null)

  const currentPathFromProps = `/matches/archive/${currentYear}/${currentLeagueSlug}/${currentRoundSlug}`
  const norm = (p: string) => p.toLowerCase().replace(/\/$/, "")

  const clearNavigating = () => {
    pathWhenStartedRef.current = pathname
    navigatingToRef.current = null
    navigatingToSegmentsRef.current = null
    setIsNavigating(false)
  }

  // pathname 변경 / 서버 props와 목표 일치 시 로딩 해제 (정규화 비교 + 세그먼트 비교)
  useEffect(() => {
    if (!isNavigating) return
    const target = navigatingToRef.current
    const segments = navigatingToSegmentsRef.current
    const pathChanged = pathname !== pathWhenStartedRef.current
    const pathOrPropsMatchTarget =
      target != null &&
      (norm(pathname) === norm(target) || norm(currentPathFromProps) === norm(target))
    const propsMatchSegments =
      segments != null &&
      String(currentYear) === segments.year &&
      currentLeagueSlug.toLowerCase() === segments.leagueSlug.toLowerCase() &&
      currentRoundSlug === segments.roundSlug
    if (pathChanged || pathOrPropsMatchTarget || propsMatchSegments) {
      clearNavigating()
    }
  }, [pathname, isNavigating, currentPathFromProps, currentYear, currentLeagueSlug, currentRoundSlug])

  // 첫 요청 시 pathname/effect가 늦게 반영되는 경우를 위해 짧은 간격으로 목표 도달 여부 확인
  useEffect(() => {
    if (!isNavigating) return
    const id = setInterval(() => {
      const target = navigatingToRef.current
      const segments = navigatingToSegmentsRef.current
      if (target == null && segments == null) return
      const pathOk =
        target != null &&
        (norm(pathname) === norm(target) || norm(currentPathFromProps) === norm(target))
      const segmentsOk =
        segments != null &&
        String(currentYear) === segments.year &&
        currentLeagueSlug.toLowerCase() === segments.leagueSlug.toLowerCase() &&
        currentRoundSlug === segments.roundSlug
      if (pathOk || segmentsOk) {
        clearNavigating()
      }
    }, 150)
    return () => clearInterval(id)
  }, [
    isNavigating,
    pathname,
    currentPathFromProps,
    currentYear,
    currentLeagueSlug,
    currentRoundSlug,
  ])

  // RSC 적용 지연 등으로 pathname이 안 바뀌는 경우 대비 타임아웃
  useEffect(() => {
    if (!isNavigating) return
    const t = setTimeout(clearNavigating, 8000)
    return () => clearTimeout(t)
  }, [isNavigating])

  function navigateTo(
    path: string,
    segments: { year: string; leagueSlug: string; roundSlug: string },
  ) {
    pathWhenStartedRef.current = pathname
    navigatingToRef.current = path
    navigatingToSegmentsRef.current = segments
    setIsNavigating(true)
    setOpen(null)
    router.push(path)
  }

  function updateSeason(year: number) {
    const y = String(year)
    navigateTo(`/matches/archive/${y}/${currentLeagueSlug}/${currentRoundSlug}`, {
      year: y,
      leagueSlug: currentLeagueSlug,
      roundSlug: currentRoundSlug,
    })
  }

  function updateLeague(leagueSlug: string) {
    if (!leagueSlug) return
    navigateTo(`/matches/archive/${currentYear}/${leagueSlug}/${currentRoundSlug}`, {
      year: String(currentYear),
      leagueSlug,
      roundSlug: currentRoundSlug,
    })
  }

  function updateRound(roundSlug: string) {
    if (!roundSlug) return
    navigateTo(`/matches/archive/${currentYear}/${currentLeagueSlug}/${roundSlug}`, {
      year: String(currentYear),
      leagueSlug: currentLeagueSlug,
      roundSlug,
    })
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
