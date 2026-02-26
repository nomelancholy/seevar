"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createMatchReferee,
  updateMatchReferee,
  deleteMatchReferee,
} from "@/lib/actions/admin-matches"
import type { RefereeRole } from "@prisma/client"

const ROLE_LABEL: Record<RefereeRole, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  VAR: "VAR",
  WAITING: "대기심",
}

const ROLES: RefereeRole[] = ["MAIN", "ASSISTANT", "VAR", "WAITING"]

type MatchRefereeItem = {
  id: string
  role: RefereeRole
  referee: { id: string; name: string; slug: string }
}

type RefereeItem = {
  id: string
  name: string
  slug: string
}

type Props = {
  matchId: string
  matchReferees: MatchRefereeItem[]
  allReferees: RefereeItem[]
}

export function AdminMatchRefereesSection({
  matchId,
  matchReferees,
  allReferees,
}: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [addRefereeId, setAddRefereeId] = useState("")
  const [addRole, setAddRole] = useState<RefereeRole>("MAIN")
  const [addPending, setAddPending] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRefereeId, setEditRefereeId] = useState("")
  const [editRole, setEditRole] = useState<RefereeRole>("MAIN")
  const [editPending, setEditPending] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (!addRefereeId) {
      setAddError("심판을 선택해 주세요.")
      return
    }
    setAddPending(true)
    const result = await createMatchReferee(matchId, addRefereeId, addRole)
    setAddPending(false)
    if (result.ok) {
      setAddRefereeId("")
      setAddRole("MAIN")
      setAdding(false)
      router.refresh()
    } else {
      setAddError(result.error)
    }
  }

  function startEdit(mr: MatchRefereeItem) {
    setEditingId(mr.id)
    setEditRefereeId(mr.referee.id)
    setEditRole(mr.role)
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function handleUpdate(e: React.FormEvent, matchRefereeId: string) {
    e.preventDefault()
    setEditError(null)
    setEditPending(true)
    const result = await updateMatchReferee(matchRefereeId, {
      refereeId: editRefereeId,
      role: editRole,
    })
    setEditPending(false)
    if (result.ok) {
      setEditingId(null)
      router.refresh()
    } else {
      setEditError(result.error)
    }
  }

  async function handleDelete(mr: MatchRefereeItem) {
    if (!confirm(`"${mr.referee.name}" (${ROLE_LABEL[mr.role]}) 배정을 삭제할까요?`)) return
    setDeletingId(mr.id)
    const result = await deleteMatchReferee(mr.id)
    setDeletingId(null)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  return (
    <div className="ledger-surface border border-border p-6">
      <h3 className="font-mono text-sm font-bold uppercase text-muted-foreground tracking-widest mb-4">
        심판 배정
      </h3>

      <div className="space-y-2 mb-6">
        {matchReferees.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">배정된 심판이 없습니다.</p>
        ) : (
          matchReferees.map((mr) =>
            editingId === mr.id ? (
              <form
                key={mr.id}
                onSubmit={(e) => handleUpdate(e, mr.id)}
                className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 border border-border"
              >
                <select
                  value={editRefereeId}
                  onChange={(e) => setEditRefereeId(e.target.value)}
                  className="bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none min-w-[140px]"
                >
                  {allReferees.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as RefereeRole)}
                  className="bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={editPending}
                  className="border border-primary bg-primary text-primary-foreground px-2 py-1 font-mono text-[10px] uppercase disabled:opacity-50"
                >
                  {editPending ? "저장 중" : "저장"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground hover:bg-muted/50"
                >
                  취소
                </button>
                {editError && (
                  <span className="w-full text-destructive text-[10px] font-mono">{editError}</span>
                )}
              </form>
            ) : (
              <div
                key={mr.id}
                className="flex items-center justify-between gap-2 p-3 border border-border font-mono text-xs"
              >
                <span className="text-muted-foreground w-14">{ROLE_LABEL[mr.role]}</span>
                <span className="font-bold flex-1">{mr.referee.name}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(mr)}
                    className="text-[10px] uppercase tracking-wider text-primary hover:underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(mr)}
                    disabled={deletingId !== null}
                    className="text-[10px] uppercase tracking-wider text-destructive hover:underline disabled:opacity-50"
                  >
                    {deletingId === mr.id ? "삭제 중" : "삭제"}
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="space-y-2 p-4 border border-border bg-muted/20">
          <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">심판 배정 추가</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={addRefereeId}
              onChange={(e) => setAddRefereeId(e.target.value)}
              className="bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none min-w-[140px]"
            >
              <option value="">심판 선택</option>
              {allReferees.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as RefereeRole)}
              className="bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={addPending}
              className="border border-primary bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] uppercase disabled:opacity-50"
            >
              {addPending ? "추가 중" : "추가"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setAddError(null) }}
              className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase text-muted-foreground hover:bg-muted/50"
            >
              취소
            </button>
          </div>
          {addError && <p className="text-destructive text-[10px] font-mono">{addError}</p>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          + 심판 배정 추가
        </button>
      )}
    </div>
  )
}
