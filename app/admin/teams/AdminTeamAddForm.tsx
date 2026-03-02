"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createTeam } from "@/lib/actions/admin-teams"

export function AdminTeamAddForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [emblemPath, setEmblemPath] = useState("")
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
    const result = await createTeam({
      name: name.trim(),
      slug: slug.trim() || undefined,
      emblemPath: emblemPath.trim() || undefined,
    })
    setPending(false)
    if (result.ok) {
      setName("")
      setSlug("")
      setEmblemPath("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
        팀 등록
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="font-mono text-xs">
          <span className="block text-muted-foreground mb-1">팀 이름 *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="인천 유나이티드"
            className="w-full bg-background border border-border px-2 py-1.5 focus:border-primary outline-none"
          />
        </label>
        <label className="font-mono text-xs">
          <span className="block text-muted-foreground mb-1">슬러그 (비우면 자동)</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="incheon_united_fc"
            className="w-full bg-background border border-border px-2 py-1.5 focus:border-primary outline-none"
          />
        </label>
        <label className="font-mono text-xs md:col-span-2">
          <span className="block text-muted-foreground mb-1">엠블럼 경로</span>
          <input
            type="text"
            value={emblemPath}
            onChange={(e) => setEmblemPath(e.target.value)}
            placeholder="/assets/emblem/2026/kleague1/xxx.svg"
            className="w-full bg-background border border-border px-2 py-1.5 focus:border-primary outline-none"
          />
        </label>
      </div>
      {error && <p className="text-destructive text-xs font-mono">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary text-primary-foreground px-4 py-2 font-mono text-[10px] uppercase tracking-wider disabled:opacity-50"
      >
        {pending ? "등록 중..." : "팀 등록"}
      </button>
    </form>
  )
}
