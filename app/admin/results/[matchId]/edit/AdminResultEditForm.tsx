"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { updateMatchResult } from "@/lib/actions/admin-results"
import type { MatchStatus, RefereeRole } from "@prisma/client"

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "SCHEDULED", label: "예정 (SCHEDULED)" },
  { value: "LIVE", label: "라이브 (LIVE)" },
  { value: "FINISHED", label: "종료 (FINISHED)" },
  { value: "CANCELLED", label: "취소 (CANCELLED)" },
]

const ROLE_LABEL: Record<RefereeRole, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  VAR: "VAR",
  WAITING: "대기심",
}

type MatchRefereeForForm = {
  id: string
  role: RefereeRole
  refereeName: string
  homeYellowCards: number
  homeRedCards: number
  awayYellowCards: number
  awayRedCards: number
}

type Props = {
  matchId: string
  initialStatus: MatchStatus
  initialScoreHome: number | null
  initialScoreAway: number | null
  initialFirstHalfExtraTime: number | null
  initialSecondHalfExtraTime: number | null
  initialExtraFirstHalfExtraTime: number | null
  initialExtraSecondHalfExtraTime: number | null
  matchReferees: MatchRefereeForForm[]
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
  matchReferees,
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
  const [cards, setCards] = useState<Record<string, { homeY: number; homeR: number; awayY: number; awayR: number }>>(
    () =>
      Object.fromEntries(
        matchReferees.map((mr) => [
          mr.id,
          {
            homeY: mr.homeYellowCards,
            homeR: mr.homeRedCards,
            awayY: mr.awayYellowCards,
            awayR: mr.awayRedCards,
          },
        ])
      )
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function numOrNull(v: string): number | null {
    const n = parseInt(v, 10)
    return v === "" || Number.isNaN(n) ? null : n
  }

  function setCard(mrId: string, field: "homeY" | "homeR" | "awayY" | "awayR", value: number) {
    setCards((prev) => ({
      ...prev,
      [mrId]: { ...prev[mrId]!, [field]: Math.max(0, value) },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const refereeCards: Record<
      string,
      { homeYellowCards: number; homeRedCards: number; awayYellowCards: number; awayRedCards: number }
    > = {}
    for (const [mrId, c] of Object.entries(cards)) {
      refereeCards[mrId] = {
        homeYellowCards: c.homeY,
        homeRedCards: c.homeR,
        awayYellowCards: c.awayY,
        awayRedCards: c.awayR,
      }
    }
    const result = await updateMatchResult(matchId, {
      status,
      scoreHome: numOrNull(String(scoreHome)),
      scoreAway: numOrNull(String(scoreAway)),
      firstHalfExtraTime: numOrNull(String(firstHalfExtraTime)),
      secondHalfExtraTime: numOrNull(String(secondHalfExtraTime)),
      extraFirstHalfExtraTime: numOrNull(String(extraFirstHalfExtraTime)),
      extraSecondHalfExtraTime: numOrNull(String(extraSecondHalfExtraTime)),
      refereeCards: Object.keys(refereeCards).length > 0 ? refereeCards : undefined,
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

      {matchReferees.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-3">
            심판별 옐로 / 레드 카드 (홈팀·원정팀)
          </h4>
          <div className="space-y-3">
            {matchReferees.map((mr) => (
              <div
                key={mr.id}
                className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-muted/20 border border-border"
              >
                <div className="col-span-2 md:col-span-1 font-mono text-xs">
                  <span className="text-muted-foreground">{ROLE_LABEL[mr.role]}</span>
                  <span className="ml-1 font-bold">{mr.refereeName}</span>
                </div>
                <label className="font-mono text-[10px]">
                  <span className="block text-muted-foreground mb-0.5">홈 옐로</span>
                  <input
                    type="number"
                    min={0}
                    value={cards[mr.id]?.homeY ?? 0}
                    onChange={(e) =>
                      setCard(mr.id, "homeY", parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full bg-background border border-border px-2 py-1 focus:border-primary outline-none"
                  />
                </label>
                <label className="font-mono text-[10px]">
                  <span className="block text-muted-foreground mb-0.5">홈 레드</span>
                  <input
                    type="number"
                    min={0}
                    value={cards[mr.id]?.homeR ?? 0}
                    onChange={(e) =>
                      setCard(mr.id, "homeR", parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full bg-background border border-border px-2 py-1 focus:border-primary outline-none"
                  />
                </label>
                <label className="font-mono text-[10px]">
                  <span className="block text-muted-foreground mb-0.5">원정 옐로</span>
                  <input
                    type="number"
                    min={0}
                    value={cards[mr.id]?.awayY ?? 0}
                    onChange={(e) =>
                      setCard(mr.id, "awayY", parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full bg-background border border-border px-2 py-1 focus:border-primary outline-none"
                  />
                </label>
                <label className="font-mono text-[10px]">
                  <span className="block text-muted-foreground mb-0.5">원정 레드</span>
                  <input
                    type="number"
                    min={0}
                    value={cards[mr.id]?.awayR ?? 0}
                    onChange={(e) =>
                      setCard(mr.id, "awayR", parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full bg-background border border-border px-2 py-1 focus:border-primary outline-none"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

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
