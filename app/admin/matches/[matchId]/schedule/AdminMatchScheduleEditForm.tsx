"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateMatchSchedule } from "@/lib/actions/admin-matches"
import type { MatchStatus } from "@prisma/client"

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "SCHEDULED", label: "예정 (SCHEDULED)" },
  { value: "LIVE", label: "라이브 (LIVE)" },
  { value: "FINISHED", label: "종료 (FINISHED)" },
  { value: "CANCELLED", label: "취소 (CANCELLED)" },
]

type Props = {
  matchId: string
  initialDate: string
  initialTime: string
  initialVenue: string
  initialStatus: MatchStatus
}

export function AdminMatchScheduleEditForm({
  matchId,
  initialDate,
  initialTime,
  initialVenue,
  initialStatus,
}: Props) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  const [venue, setVenue] = useState(initialVenue)
  const [status, setStatus] = useState<MatchStatus>(initialStatus)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    let playedAt: Date | null = null
    if (date) {
      const [y, m, d] = date.split("-").map(Number)
      const [hh = 0, mm = 0] = time ? time.split(":").map(Number) : [0, 0]
      playedAt = new Date(y, m - 1, d, hh, mm)
    }
    setPending(true)
    const result = await updateMatchSchedule(matchId, {
      playedAt,
      venue: venue.trim() || null,
      status,
    })
    setPending(false)
    if (result.ok) {
      router.push("/admin/matches")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 ledger-surface border border-border p-6">
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">경기 일자</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">경기 시간 (KST)</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">경기장</span>
        <input
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="경기장명"
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">경기 상태</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-destructive text-xs font-mono">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border border-primary bg-primary text-primary-foreground px-4 py-2 font-mono text-xs uppercase tracking-wider disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
        <Link
          href="/admin/matches"
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
        >
          취소
        </Link>
      </div>
    </form>
  )
}
