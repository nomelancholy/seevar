"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { updateMatchResult } from "@/lib/actions/admin-results"
import type { MatchStatus } from "@prisma/client"

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "SCHEDULED", label: "예정 (SCHEDULED)" },
  { value: "LIVE", label: "라이브 (LIVE)" },
  { value: "FINISHED", label: "종료 (FINISHED)" },
  { value: "CANCELLED", label: "취소 (CANCELLED)" },
]

type Props = {
  matchId: string
  initialStatus: MatchStatus
  initialScoreHome: number | null
  initialScoreAway: number | null
  initialFirstHalfExtraTime: number | null
  initialSecondHalfExtraTime: number | null
  initialExtraFirstHalfExtraTime: number | null
  initialExtraSecondHalfExtraTime: number | null
}

export function AdminResultEditForm({
  matchId,
  initialStatus,
  initialScoreHome,
  initialScoreAway,
  initialFirstHalfExtraTime,
  initialSecondHalfExtraTime,
  initialExtraFirstHalfExtraTime,
  initialExtraSecondHalfExtraTime,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<MatchStatus>(initialStatus)
  const [scoreHome, setScoreHome] = useState(initialScoreHome ?? "")
  const [scoreAway, setScoreAway] = useState(initialScoreAway ?? "")
  const [firstHalfExtraTime, setFirstHalfExtraTime] = useState(
    initialFirstHalfExtraTime ?? ""
  )
  const [secondHalfExtraTime, setSecondHalfExtraTime] = useState(
    initialSecondHalfExtraTime ?? ""
  )
  const [extraFirstHalfExtraTime, setExtraFirstHalfExtraTime] = useState(
    initialExtraFirstHalfExtraTime ?? ""
  )
  const [extraSecondHalfExtraTime, setExtraSecondHalfExtraTime] = useState(
    initialExtraSecondHalfExtraTime ?? ""
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function numOrNull(v: string): number | null {
    const n = parseInt(v, 10)
    return v === "" || Number.isNaN(n) ? null : n
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const result = await updateMatchResult(matchId, {
      status,
      scoreHome: numOrNull(String(scoreHome)),
      scoreAway: numOrNull(String(scoreAway)),
      firstHalfExtraTime: numOrNull(String(firstHalfExtraTime)),
      secondHalfExtraTime: numOrNull(String(secondHalfExtraTime)),
      extraFirstHalfExtraTime: numOrNull(String(extraFirstHalfExtraTime)),
      extraSecondHalfExtraTime: numOrNull(String(extraSecondHalfExtraTime)),
    })
    setPending(false)
    if (result.ok) {
      router.push("/admin/results")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 ledger-surface border border-border p-6">
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
      <div className="grid grid-cols-2 gap-4">
        <label className="block font-mono text-xs">
          <span className="block text-muted-foreground mb-1">홈 득점</span>
          <input
            type="number"
            min={0}
            value={scoreHome === "" ? "" : scoreHome}
            onChange={(e) => setScoreHome(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="—"
            className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
          />
        </label>
        <label className="block font-mono text-xs">
          <span className="block text-muted-foreground mb-1">원정 득점</span>
          <input
            type="number"
            min={0}
            value={scoreAway === "" ? "" : scoreAway}
            onChange={(e) => setScoreAway(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="—"
            className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="block font-mono text-xs">
          <span className="block text-muted-foreground mb-1">전반 추가시간(분)</span>
          <input
            type="number"
            min={0}
            value={firstHalfExtraTime === "" ? "" : firstHalfExtraTime}
            onChange={(e) =>
              setFirstHalfExtraTime(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="—"
            className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
          />
        </label>
        <label className="block font-mono text-xs">
          <span className="block text-muted-foreground mb-1">후반 추가시간(분)</span>
          <input
            type="number"
            min={0}
            value={secondHalfExtraTime === "" ? "" : secondHalfExtraTime}
            onChange={(e) =>
              setSecondHalfExtraTime(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="—"
            className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
          />
        </label>
        <label className="block font-mono text-xs">
          <span className="block text-muted-foreground mb-1">연장 전반 추가시간(분)</span>
          <input
            type="number"
            min={0}
            value={extraFirstHalfExtraTime === "" ? "" : extraFirstHalfExtraTime}
            onChange={(e) =>
              setExtraFirstHalfExtraTime(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="—"
            className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
          />
        </label>
        <label className="block font-mono text-xs">
          <span className="block text-muted-foreground mb-1">연장 후반 추가시간(분)</span>
          <input
            type="number"
            min={0}
            value={extraSecondHalfExtraTime === "" ? "" : extraSecondHalfExtraTime}
            onChange={(e) =>
              setExtraSecondHalfExtraTime(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="—"
            className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
          />
        </label>
      </div>
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
          href="/admin/results"
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
        >
          취소
        </Link>
      </div>
    </form>
  )
}
