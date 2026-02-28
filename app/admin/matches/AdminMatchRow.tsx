"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteMatch, updateMatchSchedule } from "@/lib/actions/admin-matches"
import type { MatchStatus } from "@prisma/client"

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "SCHEDULED", label: "예정" },
  { value: "LIVE", label: "라이브" },
  { value: "FINISHED", label: "종료" },
  { value: "CANCELLED", label: "취소" },
]

type Match = {
  id: string
  roundOrder: number
  playedAt: Date | null
  venue: string | null
  status: MatchStatus
  homeTeam: { name: string }
  awayTeam: { name: string }
}

type Props = {
  match: Match
  matchDetailPath: string
  dateStr: string
  timeStr: string
}

export function AdminMatchRow({ match, matchDetailPath, dateStr, timeStr }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [statusPending, setStatusPending] = useState(false)

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as MatchStatus
    if (newStatus === match.status) return
    setStatusPending(true)
    const result = await updateMatchSchedule(match.id, { status: newStatus })
    setStatusPending(false)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  async function handleDelete() {
    if (!confirm(`"${match.homeTeam.name} vs ${match.awayTeam.name}" 경기를 삭제할까요?`)) return
    setDeleting(true)
    const result = await deleteMatch(match.id)
    setDeleting(false)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  return (
    <div className="grid grid-cols-12 gap-2 p-3 md:p-4 items-center font-mono text-xs">
      <div className="col-span-2">
        <p className="font-bold">{dateStr}</p>
        <p className="text-muted-foreground text-[10px]">{timeStr} KST</p>
      </div>
      <div className="col-span-1 text-muted-foreground">{match.roundOrder}</div>
      <div className="col-span-4 text-center">
        {match.homeTeam.name} vs {match.awayTeam.name}
      </div>
      <div className="col-span-1">
        <select
          value={match.status}
          onChange={handleStatusChange}
          disabled={statusPending}
          className="w-full bg-background border border-border px-1.5 py-1 text-[10px] focus:border-primary outline-none disabled:opacity-50"
          title="경기 상태 변경"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 text-muted-foreground truncate">{match.venue ?? "—"}</div>
      <div className="col-span-2 flex items-center justify-end gap-2">
        <Link
          href={`/admin/matches/${match.id}/schedule`}
          className="text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          일정 수정
        </Link>
        <Link
          href={matchDetailPath}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] uppercase tracking-wider text-muted-foreground hover:underline"
        >
          상세
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-[10px] uppercase tracking-wider text-destructive hover:underline disabled:opacity-50"
        >
          {deleting ? "삭제 중" : "삭제"}
        </button>
      </div>
    </div>
  )
}
