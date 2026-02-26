"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createNoticeComment } from "@/lib/actions/notices"

type CommentItem = {
  id: string
  content: string
  userName: string | null
  createdAt: string
}

type Props = {
  noticeId: string
  comments: CommentItem[]
  currentUserId: string | null
}

export function NoticeCommentSection({ noticeId, comments: initialComments, currentUserId }: Props) {
  const [content, setContent] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) return
    setPending(true)
    setError(null)
    const result = await createNoticeComment(noticeId, content)
    setPending(false)
    if (result.ok) {
      setContent("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <section className="ledger-surface p-4 md:p-8 border border-border">
      <h2 className="font-mono text-xs md:text-sm font-bold tracking-widest text-muted-foreground uppercase mb-4 md:mb-6">
        댓글 ({initialComments.length})
      </h2>
      <ul className="space-y-4 mb-6 md:mb-8">
        {initialComments.map((c) => (
          <li key={c.id} className="py-3 border-b border-border last:border-b-0">
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.content}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-2">
              {c.userName ?? "익명"} · {new Date(c.createdAt).toLocaleString("ko-KR")}
            </p>
          </li>
        ))}
      </ul>
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="댓글을 입력하세요."
            rows={3}
            className="w-full bg-background border border-border p-3 font-mono text-sm focus:border-primary outline-none resize-none"
          />
          {error && <p className="text-destructive text-xs font-mono">{error}</p>}
          <button
            type="submit"
            disabled={pending || !content.trim()}
            className="border border-primary bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-bold uppercase hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "등록 중…" : "댓글 등록"}
          </button>
        </form>
      ) : (
        <p className="font-mono text-xs text-muted-foreground">로그인하면 댓글을 남길 수 있습니다.</p>
      )}
    </section>
  )
}
