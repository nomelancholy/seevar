"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { updateTeam } from "@/lib/actions/admin-teams"

type Props = {
  teamId: string
  initialName: string
  initialSlug: string
  initialEmblemPath: string
}

export function AdminTeamEditForm({
  teamId,
  initialName,
  initialSlug,
  initialEmblemPath,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [emblemPath, setEmblemPath] = useState(initialEmblemPath)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError("팀 이름을 입력해 주세요.")
      return
    }
    setPending(true)
    const result = await updateTeam(teamId, {
      name: name.trim(),
      slug: slug.trim() || null,
      emblemPath: emblemPath.trim() || null,
    })
    setPending(false)
    if (result.ok) {
      router.push("/admin/teams")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 ledger-surface border border-border p-6">
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">팀 이름 *</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">슬러그 (비우면 유지)</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="incheon_united_fc"
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">엠블럼 경로</span>
        <input
          type="text"
          value={emblemPath}
          onChange={(e) => setEmblemPath(e.target.value)}
          placeholder="/assets/emblem/2026/kleague1/xxx.svg"
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      {error && <p className="text-destructive text-xs font-mono">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border border-primary bg-primary text-primary-foreground px-4 py-2 font-mono text-[10px] uppercase tracking-wider disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
        <Link
          href="/admin/teams"
          className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wider hover:bg-muted/50"
        >
          취소
        </Link>
      </div>
    </form>
  )
}
