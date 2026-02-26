"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createReferee } from "@/lib/actions/admin-referees"

export function AdminRefereeAddForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [link, setLink] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) {
      setError("이름을 입력해 주세요.")
      return
    }
    setPending(true)
    const result = await createReferee({
      name: trimmed,
      slug: slug.trim() || undefined,
      link: link.trim() || undefined,
    })
    setPending(false)
    if (result.ok) {
      setName("")
      setSlug("")
      setLink("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
        심판 등록
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="font-mono text-xs">
          <span className="block text-muted-foreground mb-1">이름 *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="w-full bg-background border border-border px-2 py-1.5 focus:border-primary outline-none"
          />
        </label>
        <label className="font-mono text-xs">
          <span className="block text-muted-foreground mb-1">슬러그 (비우면 자동)</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="hong-gildong"
            className="w-full bg-background border border-border px-2 py-1.5 focus:border-primary outline-none"
          />
        </label>
        <label className="font-mono text-xs md:col-span-2">
          <span className="block text-muted-foreground mb-1">프로필 링크</span>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
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
        {pending ? "등록 중..." : "심판 등록"}
      </button>
    </form>
  )
}
