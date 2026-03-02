"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteTeam } from "@/lib/actions/admin-teams"

type Team = {
  id: string
  name: string
  slug: string | null
  emblemPath: string | null
  _count: { homeMatches: number; awayMatches: number; users: number }
}

type Props = { team: Team }

export function AdminTeamRow({ team }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const matchCount = team._count.homeMatches + team._count.awayMatches

  async function handleDelete() {
    if (
      !confirm(
        `"${team.name}" 팀을 삭제할까요? 경기 배정이 있거나 응원팀으로 선택한 유저가 있으면 삭제할 수 없습니다.`
      )
    )
      return
    setDeleting(true)
    const result = await deleteTeam(team.id)
    setDeleting(false)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  return (
    <div className="grid grid-cols-12 gap-2 p-3 md:p-4 items-center font-mono text-xs">
      <div className="col-span-3 font-bold">{team.name}</div>
      <div className="col-span-2 text-muted-foreground truncate">{team.slug ?? "—"}</div>
      <div className="col-span-4 truncate text-muted-foreground text-[10px]">
        {team.emblemPath ?? "—"}
      </div>
      <div className="col-span-1 text-center text-muted-foreground">{matchCount}</div>
      <div className="col-span-1 text-center text-muted-foreground">{team._count.users}</div>
      <div className="col-span-1 flex items-center justify-end gap-2">
        <Link
          href={`/admin/teams/${team.id}/edit`}
          className="text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          수정
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || matchCount > 0 || team._count.users > 0}
          className="text-[10px] uppercase tracking-wider text-destructive hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            matchCount > 0
              ? "경기 배정이 있어 삭제 불가"
              : team._count.users > 0
                ? "응원팀으로 선택한 유저가 있음"
                : undefined
          }
        >
          {deleting ? "삭제 중" : "삭제"}
        </button>
      </div>
    </div>
  )
}
