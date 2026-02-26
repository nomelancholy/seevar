"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createSeason,
  createLeague,
  createRound,
} from "@/lib/actions/admin-matches"

type Props = {
  baseUrl: string
  currentYear: number
  currentLeagueSlug: string
  seasonId: string | null
  leagueId: string | null
  seasons: { id: string; year: number }[]
  leagues: { id: string; name: string; slug: string }[]
}

export function AdminStructureForms({
  baseUrl,
  currentYear,
  currentLeagueSlug,
  seasonId,
  leagueId,
  seasons,
  leagues,
}: Props) {
  const router = useRouter()
  const [yearInput, setYearInput] = useState("")
  const [leagueName, setLeagueName] = useState("")
  const [leagueSlugInput, setLeagueSlugInput] = useState("")
  const [roundNumber, setRoundNumber] = useState("")
  const [roundTargetLeagueId, setRoundTargetLeagueId] = useState<string>("")
  const [pendingSeason, setPendingSeason] = useState(false)
  const [pendingLeague, setPendingLeague] = useState(false)
  const [pendingRound, setPendingRound] = useState(false)
  const [errorSeason, setErrorSeason] = useState<string | null>(null)
  const [errorLeague, setErrorLeague] = useState<string | null>(null)
  const [errorRound, setErrorRound] = useState<string | null>(null)

  const effectiveRoundLeagueId = roundTargetLeagueId || leagueId || leagues[0]?.id || ""

  async function handleAddSeason(e: React.FormEvent) {
    e.preventDefault()
    setErrorSeason(null)
    const y = parseInt(yearInput, 10)
    if (Number.isNaN(y)) {
      setErrorSeason("연도를 입력해 주세요.")
      return
    }
    setPendingSeason(true)
    const result = await createSeason(y)
    setPendingSeason(false)
    if (result.ok) {
      setYearInput("")
      router.push(`${baseUrl}?year=${result.year}`)
      router.refresh()
    } else {
      setErrorSeason(result.error)
    }
  }

  async function handleAddLeague(e: React.FormEvent) {
    e.preventDefault()
    setErrorLeague(null)
    if (!seasonId) return
    const name = leagueName.trim()
    const slug = leagueSlugInput.trim() || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    if (!name) {
      setErrorLeague("리그 이름을 입력해 주세요.")
      return
    }
    setPendingLeague(true)
    const result = await createLeague({ seasonId, name, slug })
    setPendingLeague(false)
    if (result.ok) {
      setLeagueName("")
      setLeagueSlugInput("")
      router.push(`${baseUrl}?year=${currentYear}&league=${result.slug}`)
      router.refresh()
    } else {
      setErrorLeague(result.error)
    }
  }

  async function handleAddRound(e: React.FormEvent) {
    e.preventDefault()
    setErrorRound(null)
    const targetLeagueId = effectiveRoundLeagueId
    if (!targetLeagueId) return
    const num = parseInt(roundNumber, 10)
    if (Number.isNaN(num) || num < 1) {
      setErrorRound("라운드 번호를 1 이상으로 입력해 주세요.")
      return
    }
    setPendingRound(true)
    const result = await createRound({ leagueId: targetLeagueId, number: num })
    setPendingRound(false)
    if (result.ok) {
      setRoundNumber("")
      router.push(`${baseUrl}?year=${currentYear}&league=${currentLeagueSlug}&round=${result.slug}`)
      router.refresh()
    } else {
      setErrorRound(result.error)
    }
  }

  return (
    <div className="mt-6 p-4 border border-border bg-muted/20 space-y-4">
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
        시즌 · 리그 · 라운드 추가
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <form onSubmit={handleAddSeason} className="space-y-2">
          <label className="block font-mono text-[10px] text-muted-foreground">
            시즌(연도) 추가
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1990}
              max={2100}
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              placeholder="2027"
              className="flex-1 bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
            />
            <button
              type="submit"
              disabled={pendingSeason}
              className="border border-primary bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] uppercase disabled:opacity-50"
            >
              {pendingSeason ? "추가 중" : "추가"}
            </button>
          </div>
          {errorSeason && <p className="text-destructive text-[10px] font-mono">{errorSeason}</p>}
        </form>

        <form onSubmit={handleAddLeague} className="space-y-2">
          <label className="block font-mono text-[10px] text-muted-foreground">
            리그 추가 {seasonId && `(${currentYear} 시즌)`}
          </label>
          {!seasonId ? (
            <p className="text-muted-foreground text-[10px]">시즌을 선택하면 추가할 수 있습니다.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="K League 1"
                  className="w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
                />
                <input
                  type="text"
                  value={leagueSlugInput}
                  onChange={(e) => setLeagueSlugInput(e.target.value)}
                  placeholder="kleague1 (슬러그, 비우면 자동)"
                  className="w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  disabled={pendingLeague}
                  className="border border-primary bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] uppercase disabled:opacity-50"
                >
                  {pendingLeague ? "추가 중" : "추가"}
                </button>
              </div>
              {errorLeague && <p className="text-destructive text-[10px] font-mono">{errorLeague}</p>}
            </>
          )}
        </form>

        <form onSubmit={handleAddRound} className="space-y-2">
          <label className="block font-mono text-[10px] text-muted-foreground">
            라운드 추가 (리그별로 round-N)
          </label>
          {leagues.length === 0 ? (
            <p className="text-muted-foreground text-[10px]">리그를 먼저 추가하세요.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={effectiveRoundLeagueId}
                  onChange={(e) => setRoundTargetLeagueId(e.target.value)}
                  className="bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none min-w-[140px]"
                >
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground text-[10px]">·</span>
                <input
                  type="number"
                  min={1}
                  value={roundNumber}
                  onChange={(e) => setRoundNumber(e.target.value)}
                  placeholder="1"
                  className="w-16 bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
                />
                <span className="text-muted-foreground text-[10px]">라운드</span>
                <button
                  type="submit"
                  disabled={pendingRound}
                  className="border border-primary bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] uppercase disabled:opacity-50"
                >
                  {pendingRound ? "추가 중" : "추가"}
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground">
                슬러그는 round-{roundNumber || "N"}으로 생성됩니다. 같은 리그 안에서만 번호 중복 불가.
              </p>
              {errorRound && <p className="text-destructive text-[10px] font-mono">{errorRound}</p>}
            </>
          )}
        </form>
      </div>
    </div>
  )
}
