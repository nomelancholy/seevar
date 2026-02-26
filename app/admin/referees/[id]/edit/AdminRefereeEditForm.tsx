"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { updateReferee } from "@/lib/actions/admin-referees"

type Props = {
  refereeId: string
  initialName: string
  initialSlug: string
  initialLink: string
}

export function AdminRefereeEditForm({
  refereeId,
  initialName,
  initialSlug,
  initialLink,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [link, setLink] = useState(initialLink)
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
    if (!slug.trim()) {
      setError("슬러그를 입력해 주세요.")
      return
    }
    setPending(true)
    const result = await updateReferee(refereeId, {
      name: trimmed,
      slug: slug.trim(),
      link: link.trim() || undefined,
    })
    setPending(false)
    if (result.ok) {
      router.push("/admin/referees")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 ledger-surface border border-border p-6">
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">이름 *</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">슬러그 * (URL 경로)</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">프로필 링크</span>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
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
          href="/admin/referees"
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
        >
          취소
        </Link>
      </div>
    </form>
  )
}
