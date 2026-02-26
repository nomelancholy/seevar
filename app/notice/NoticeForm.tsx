"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createNotice } from "@/lib/actions/notices"

type Props = {
  noticeId?: string
  noticeNumber?: number
  initialTitle?: string
  initialContent?: string
  initialAllowComments?: boolean
  mode?: "create" | "edit"
}

export function NoticeForm({
  noticeId,
  noticeNumber,
  initialTitle = "",
  initialContent = "",
  initialAllowComments = true,
  mode = "create",
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [allowComments, setAllowComments] = useState(initialAllowComments)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result =
      mode === "create"
        ? await createNotice({ title, content, allowComments })
        : await (async () => {
            const { updateNotice } = await import("@/lib/actions/notices")
            return updateNotice(noticeId!, { title, content, allowComments })
          })()
    setPending(false)
    if (result.ok) {
      if (mode === "create" && "number" in result) router.push(`/notice/${result.number}`)
      else if (mode === "edit" && noticeNumber != null) router.push(`/notice/${noticeNumber}`)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ledger-surface p-4 md:p-8 border border-border space-y-6">
      <div>
        <label className="block font-mono text-xs text-muted-foreground uppercase mb-2">
          제목
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 200))}
          required
          className="w-full bg-background border border-border px-3 py-2 font-mono text-sm focus:border-primary outline-none"
          placeholder="공지 제목"
        />
      </div>
      <div>
        <label className="block font-mono text-xs text-muted-foreground uppercase mb-2">
          내용
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="w-full bg-background border border-border p-3 font-mono text-sm focus:border-primary outline-none resize-y"
          placeholder="공지 내용"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allowComments"
          checked={allowComments}
          onChange={(e) => setAllowComments(e.target.checked)}
          className="rounded border-border"
        />
        <label htmlFor="allowComments" className="font-mono text-xs text-muted-foreground">
          댓글 허용
        </label>
      </div>
      {error && <p className="text-destructive text-sm font-mono">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary text-primary-foreground px-6 py-2 font-mono text-xs font-bold uppercase hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "저장 중…" : mode === "create" ? "등록" : "수정"}
      </button>
    </form>
  )
}
