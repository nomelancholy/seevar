"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteReferee } from "@/lib/actions/admin-referees"

type Referee = {
  id: string
  name: string
  slug: string
  link: string | null
  _count: { matchReferees: number }
}

type Props = { referee: Referee }

export function AdminRefereeRow({ referee }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`"${referee.name}" 심판을 삭제할까요? 배정된 경기가 있으면 삭제할 수 없습니다.`)) return
    setDeleting(true)
    const result = await deleteReferee(referee.id)
    setDeleting(false)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  return (
    <div className="grid grid-cols-12 gap-2 p-3 md:p-4 items-center font-mono text-xs">
      <div className="col-span-3 font-bold">{referee.name}</div>
      <div className="col-span-3 text-muted-foreground truncate">{referee.slug}</div>
      <div className="col-span-4 truncate text-muted-foreground">
        {referee.link ? (
          <a
            href={referee.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {referee.link}
          </a>
        ) : (
          "—"
        )}
      </div>
      <div className="col-span-1 text-center text-muted-foreground">
        {referee._count.matchReferees}
      </div>
      <div className="col-span-1 flex items-center justify-end gap-2">
        <Link
          href={`/admin/referees/${referee.id}/edit`}
          className="text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          수정
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || referee._count.matchReferees > 0}
          className="text-[10px] uppercase tracking-wider text-destructive hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          title={referee._count.matchReferees > 0 ? "배정 경기가 있어 삭제 불가" : undefined}
        >
          {deleting ? "삭제 중" : "삭제"}
        </button>
      </div>
    </div>
  )
}
