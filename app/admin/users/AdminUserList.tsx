"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { updateUserNickname } from "@/lib/actions/admin-users"

type User = {
  id: string
  email: string | null
  name: string | null
  createdAt: Date
  supportingTeam: { id: string; name: string } | null
}

type Props = { users: User[] }

export function AdminUserList({ users }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [pending, setPending] = useState(false)

  function startEdit(u: User) {
    setEditingId(u.id)
    setEditValue(u.name ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue("")
  }

  async function saveEdit(userId: string) {
    setPending(true)
    const result = await updateUserNickname(userId, editValue.trim() || null)
    setPending(false)
    if (result.ok) {
      setEditingId(null)
      setEditValue("")
      router.refresh()
    } else {
      alert(result.error)
    }
  }

  function formatDate(d: Date) {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  return (
    <div className="ledger-surface border border-border overflow-hidden">
      <div className="grid grid-cols-12 gap-2 p-3 border-b border-border font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card/50">
        <div className="col-span-4">이메일</div>
        <div className="col-span-3">닉네임</div>
        <div className="col-span-3">응원팀</div>
        <div className="col-span-1">가입일</div>
        <div className="col-span-1 text-right">작업</div>
      </div>
      <div className="divide-y divide-border">
        {users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-xs">
            가입한 유저가 없습니다.
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-12 gap-2 p-3 md:p-4 items-center font-mono text-xs"
            >
              <div className="col-span-4 truncate text-muted-foreground" title={u.email ?? undefined}>
                {u.email ?? "—"}
              </div>
              <div className="col-span-3">
                {editingId === u.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 min-w-0 bg-card border border-border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="닉네임"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(u.id)}
                      disabled={pending}
                      className="text-[10px] uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                    >
                      {pending ? <Loader2 className="size-3 animate-spin inline" /> : "저장"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={pending}
                      className="text-[10px] uppercase tracking-wider text-muted-foreground hover:underline"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <span className="font-bold">{u.name ?? "—"}</span>
                )}
              </div>
              <div className="col-span-3 truncate text-muted-foreground">
                {u.supportingTeam?.name ?? "—"}
              </div>
              <div className="col-span-1 text-muted-foreground text-[10px]">
                {formatDate(u.createdAt)}
              </div>
              <div className="col-span-1 flex justify-end">
                {editingId === u.id ? null : (
                  <button
                    type="button"
                    onClick={() => startEdit(u)}
                    className="text-[10px] uppercase tracking-wider text-primary hover:underline"
                  >
                    수정
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
