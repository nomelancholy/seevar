"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createMatchReferee } from "@/lib/actions/admin-matches"
import type { RefereeRole } from "@prisma/client"
import { EmblemImage } from "@/components/ui/EmblemImage"

const ROLE_LABEL: Record<RefereeRole, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  VAR: "VAR",
  WAITING: "대기심",
}

const ROLES: RefereeRole[] = ["MAIN", "ASSISTANT", "WAITING", "VAR"]

/** 역할별 최대 배정 인원 (부심·VAR 2명, 주심·대기심 1명) */
const MAX_PER_ROLE: Record<RefereeRole, number> = {
  MAIN: 1,
  ASSISTANT: 2,
  VAR: 2,
  WAITING: 1,
}

type Match = {
  id: string
  roundOrder: number
  playedAt: Date | null
  homeTeam: { name: string; emblemPath: string | null }
  awayTeam: { name: string; emblemPath: string | null }
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

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const matchId = (form.elements.namedItem("matchId") as HTMLInputElement | null)?.value
    const role = (form.elements.namedItem("role") as HTMLInputElement | null)?.value as RefereeRole | undefined
    if (!matchId || !role || !ROLES.includes(role)) {
      setError("잘못된 요청입니다.")
      return
    }
    const selectedRefereeId = (form.elements.namedItem("refereeId") as HTMLSelectElement | null)?.value
    if (!selectedRefereeId) {
      setError("심판을 선택해 주세요.")
      return
    }
    setPending(true)
    setError(null)
    const result = await createMatchReferee(matchId, selectedRefereeId, role)
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
        <table className="w-full font-mono text-[10px] md:text-xs min-w-[520px] md:min-w-0">
          <thead>
            <tr className="border-b border-border bg-card/50 font-bold text-muted-foreground uppercase tracking-widest">
              <th className="text-left p-1 md:p-2 w-9 md:w-14 text-[9px] md:text-[10px]">일자</th>
              <th className="text-left p-1 md:p-2 w-6 md:w-8 text-[9px] md:text-[10px]">경기</th>
              <th className="text-center p-1 md:p-2 w-16 md:min-w-[100px] text-[9px] md:text-[10px]">매치업</th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  className={`text-left p-1 md:p-2 whitespace-nowrap ${role === "ASSISTANT" || role === "VAR" ? "min-w-[72px] md:min-w-[100px] md:w-28" : "w-14 md:w-24"}`}
                >
                  <span className="text-[9px] md:text-[10px]">{ROLE_LABEL[role]}</span>
                  {MAX_PER_ROLE[role] > 1 && (
                    <span className="block font-normal text-muted-foreground text-[8px] md:text-[9px]">
                      (최대 {MAX_PER_ROLE[role]}명)
                    </span>
                  )}
                </th>
              ))}
              <th className="text-right p-1 md:p-2 w-10 md:w-12 text-[9px] md:text-[10px]">작업</th>
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
                  <td className="p-1 md:p-2 text-muted-foreground whitespace-nowrap">{formatDate(m.playedAt)}</td>
                  <td className="p-1 md:p-2 text-muted-foreground">{m.roundOrder}</td>
                  <td className="p-1 md:p-2 text-center">
                    <span className="inline-flex items-center justify-center gap-0.5" title={`${m.homeTeam.name} vs ${m.awayTeam.name}`}>
                      {m.homeTeam.emblemPath ? (
                        <EmblemImage
                          src={m.homeTeam.emblemPath}
                          width={20}
                          height={20}
                          className="w-5 h-5 md:w-6 md:h-6 shrink-0 object-contain"
                        />
                      ) : (
                        <span className="w-5 h-5 md:w-6 md:h-6 rounded bg-muted shrink-0 inline-block" />
                      )}
                      <span className="text-[8px] md:text-[9px] font-bold text-muted-foreground">VS</span>
                      {m.awayTeam.emblemPath ? (
                        <EmblemImage
                          src={m.awayTeam.emblemPath}
                          width={20}
                          height={20}
                          className="w-5 h-5 md:w-6 md:h-6 shrink-0 object-contain"
                        />
                      ) : (
                        <span className="w-5 h-5 md:w-6 md:h-6 rounded bg-muted shrink-0 inline-block" />
                      )}
                    </span>
                  </td>
                  {ROLES.map((role) => {
                    const assignedList = m.matchReferees
                      .filter((r) => r.role === role)
                      .sort((a, b) => a.referee.name.localeCompare(b.referee.name, "ko"))
                    const maxForRole = MAX_PER_ROLE[role]
                    const canAddMore = assignedList.length < maxForRole
                    const isAdding = adding?.matchId === m.id && adding?.role === role
                    return (
                      <td key={`${m.id}-${role}`} className="p-1 md:p-2 align-top">
                        <div className="flex flex-col gap-0.5 md:gap-1">
                          {assignedList.length > 0 && (
                            <div className="flex flex-col gap-0 text-foreground">
                              {assignedList.map((a) => (
                                <span key={a.id} className="text-[10px] md:text-xs leading-tight">
                                  {a.referee.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {isAdding ? (
                            <form
                              onSubmit={handleAdd}
                              className="flex flex-wrap items-center gap-0.5 md:gap-1"
                            >
                              <input type="hidden" name="matchId" value={m.id} />
                              <input type="hidden" name="role" value={role} />
                              <select
                                name="refereeId"
                                value={refereeId}
                                onChange={(e) => setRefereeId(e.target.value)}
                                className="bg-background border border-border px-1 py-0.5 text-[10px] focus:border-primary outline-none max-w-[72px] md:max-w-[90px]"
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
                          ) : canAddMore ? (
                            <button
                              type="button"
                              onClick={() => setAdding({ matchId: m.id, role })}
                              className="text-[10px] text-primary hover:underline w-fit"
                            >
                              {assignedList.length > 0 ? "+ 2번째" : "+ 배정"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    )
                  })}
                  <td className="p-1 md:p-2 text-right whitespace-nowrap">
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
