"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createMatch } from "@/lib/actions/admin-matches"

type Props = {
  roundId: string
  teams: { id: string; name: string }[]
  nextOrder: number
}

export function AdminAddMatchForm({ roundId, teams, nextOrder }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [homeTeamId, setHomeTeamId] = useState("")
  const [awayTeamId, setAwayTeamId] = useState("")
  const [roundOrder, setRoundOrder] = useState(nextOrder)
  const [playedAtDate, setPlayedAtDate] = useState("")
  const [playedAtTime, setPlayedAtTime] = useState("")
  const [venue, setVenue] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!homeTeamId || !awayTeamId) {
      setError("홈팀과 원정팀을 선택해 주세요.")
      return
    }
    if (homeTeamId === awayTeamId) {
      setError("홈팀과 원정팀이 같을 수 없습니다.")
      return
    }
    let playedAt: Date | null = null
    if (playedAtDate) {
      const [y, m, d] = playedAtDate.split("-").map(Number)
      const [hh = 0, mm = 0] = playedAtTime ? playedAtTime.split(":").map(Number) : [0, 0]
      playedAt = new Date(y, m - 1, d, hh, mm)
    }
    setPending(true)
    const result = await createMatch({
      roundId,
      roundOrder,
      homeTeamId,
      awayTeamId,
      playedAt,
      venue: venue.trim() || null,
    })
    setPending(false)
    if (result.ok) {
      setHomeTeamId("")
      setAwayTeamId("")
      setRoundOrder(nextOrder + 1)
      setPlayedAtDate("")
      setPlayedAtTime("")
      setVenue("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
        경기 추가
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="font-mono text-[10px]">
          <span className="block text-muted-foreground mb-1">홈팀</span>
          <select
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            className="w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
          >
            <option value="">선택</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="font-mono text-[10px]">
          <span className="block text-muted-foreground mb-1">원정팀</span>
          <select
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            className="w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
          >
            <option value="">선택</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="font-mono text-[10px]">
          <span className="block text-muted-foreground mb-1">순서</span>
          <input
            type="number"
            min={1}
            value={roundOrder}
            onChange={(e) => setRoundOrder(parseInt(e.target.value, 10) || 1)}
            className="w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
          />
        </label>
        <label className="font-mono text-[10px]">
          <span className="block text-muted-foreground mb-1">경기장</span>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="선택"
            className="w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
          />
        </label>
        <label className="font-mono text-[10px]">
          <span className="block text-muted-foreground mb-1">일자</span>
          <input
            type="date"
            value={playedAtDate}
            onChange={(e) => setPlayedAtDate(e.target.value)}
            className="w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
          />
        </label>
        <label className="font-mono text-[10px]">
          <span className="block text-muted-foreground mb-1">시간</span>
          <input
            type="time"
            value={playedAtTime}
            onChange={(e) => setPlayedAtTime(e.target.value)}
            className="w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
          />
        </label>
      </div>
      {error && <p className="text-destructive text-xs font-mono">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary text-primary-foreground px-4 py-2 font-mono text-[10px] uppercase tracking-wider disabled:opacity-50"
      >
        {pending ? "추가 중..." : "경기 추가"}
      </button>
    </form>
  )
}
