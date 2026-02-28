"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createMatchReferee } from "@/lib/actions/admin-matches"
import type { RefereeRole } from "@prisma/client"

const ROLE_LABEL: Record<RefereeRole, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  VAR: "VAR",
  WAITING: "대기심",
}

const ROLES: RefereeRole[] = ["MAIN", "ASSISTANT", "VAR", "WAITING"]

type Match = {
  id: string
  roundOrder: number
  playedAt: Date | null
  homeTeam: { name: string }
  awayTeam: { name: string }
  matchReferees: { id: string; role: RefereeRole; referee: { id: string; name: string; slug: string } }[]
}

type Props = {
  matches: Match[]
  seasonYear: number
  leagueName: string
  roundSlug: string
  allReferees: { id: string; name: string; slug: string }[]
}

function formatDate(d: Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, "/").replace(".", "")
}

export function AdminRefereeAssignmentList({
  matches,
  seasonYear,
  leagueName,
  roundSlug,
  allReferees,
}: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState<{ matchId: string; role: RefereeRole } | null>(null)
  const [refereeId, setRefereeId] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(matchId: string, role: RefereeRole) {
    if (!refereeId) {
      setError("심판을 선택해 주세요.")
      return
    }
    setPending(true)
    setError(null)
    const result = await createMatchReferee(matchId, refereeId, role)
    setPending(false)
    if (result.ok) {
      setAdding(null)
      setRefereeId("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="mt-8">
      <h3 className="font-mono text-sm font-bold uppercase text-muted-foreground mb-3">
        {seasonYear} {leagueName} · {roundSlug}
      </h3>
      <div className="ledger-surface border border-border overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-border bg-card/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <th className="text-left p-2 w-14">일자</th>
              <th className="text-left p-2 w-8">경기</th>
              <th className="text-center p-2 min-w-[160px]">매치업</th>
              {ROLES.map((role) => (
                <th key={role} className="text-left p-2 w-24">
                  {ROLE_LABEL[role]}
                </th>
              ))}
              <th className="text-right p-2 w-12">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches.length === 0 ? (
              <tr>
                <td colSpan={ROLES.length + 4} className="p-8 text-center text-muted-foreground">
                  이 라운드에 등록된 경기가 없습니다.
                </td>
              </tr>
            ) : (
              matches.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="p-2 text-muted-foreground">{formatDate(m.playedAt)}</td>
                  <td className="p-2 text-muted-foreground">{m.roundOrder}</td>
                  <td className="p-2 text-center font-bold">
                    {m.homeTeam.name} vs {m.awayTeam.name}
                  </td>
                  {ROLES.map((role) => {
                    const assigned = m.matchReferees.find((r) => r.role === role)
                    const isAdding = adding?.matchId === m.id && adding?.role === role
                    return (
                      <td key={role} className="p-2">
                        {assigned ? (
                          <span className="text-foreground">{assigned.referee.name}</span>
                        ) : isAdding ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              handleAdd(m.id, role)
                            }}
                            className="flex flex-wrap items-center gap-1"
                          >
                            <select
                              value={refereeId}
                              onChange={(e) => setRefereeId(e.target.value)}
                              className="bg-background border border-border px-1.5 py-0.5 text-[10px] focus:border-primary outline-none max-w-[90px]"
                            >
                              <option value="">선택</option>
                              {allReferees.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              disabled={pending}
                              className="text-[10px] text-primary hover:underline disabled:opacity-50"
                            >
                              추가
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdding(null)
                                setError(null)
                              }}
                              className="text-[10px] text-muted-foreground hover:underline"
                            >
                              취소
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAdding({ matchId: m.id, role })}
                            className="text-[10px] text-primary hover:underline"
                          >
                            + 배정
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="p-2 text-right">
                    <Link
                      href={`/admin/matches/${m.id}/schedule`}
                      className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      상세
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {error && (
        <p className="p-3 border-t border-border text-destructive font-mono text-[10px]">
          {error}
        </p>
      )}
    </div>
  )
}
