"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  createNoticeComment,
  updateNoticeComment,
  deleteNoticeComment,
} from "@/lib/actions/notices"

type CommentItem = {
  id: string
  userId: string
  content: string
  userName: string | null
  createdAt: string
  replies?: CommentItem[]
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
  const [optimisticComment, setOptimisticComment] = useState<CommentItem | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [replyPending, setReplyPending] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const prevCommentsLengthRef = useRef(initialComments.length)
  const router = useRouter()

  useEffect(() => {
    if (initialComments.length > prevCommentsLengthRef.current) {
      setOptimisticComment(null)
    }
    prevCommentsLengthRef.current = initialComments.length
  }, [initialComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) return
    setPending(true)
    setError(null)
    const textToSend = content.trim()
    const result = await createNoticeComment(noticeId, textToSend)
    setPending(false)
    if (result.ok) {
      setContent("")
      setOptimisticComment({
        id: `opt-${Date.now()}`,
        userId: currentUserId ?? "",
        content: textToSend,
        userName: null,
        createdAt: new Date().toISOString(),
      })
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  const handleReplySubmit = async (parentId: string) => {
    if (!currentUserId) return
    const textToSend = replyContent.trim()
    if (!textToSend) return
    setReplyPending(true)
    setError(null)
    const result = await createNoticeComment(noticeId, textToSend, parentId)
    setReplyPending(false)
    if (result.ok) {
      setReplyingToId(null)
      setReplyContent("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  const totalCount = initialComments.reduce((s, c) => s + 1 + (c.replies?.length ?? 0), 0) + (optimisticComment ? 1 : 0)
  const displayComments = optimisticComment
    ? [...initialComments, optimisticComment]
    : initialComments

  const handleStartEdit = (comment: CommentItem) => {
    setEditingId(comment.id)
    setEditingContent(comment.content)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingContent("")
  }

  const handleSaveEdit = async (commentId: string) => {
    if (!currentUserId) return
    const text = editingContent.trim()
    if (!text) return
    setActionPending(true)
    setError(null)
    const result = await updateNoticeComment(commentId, text)
    setActionPending(false)
    if (result.ok) {
      setEditingId(null)
      setEditingContent("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!currentUserId) return
    if (!confirm("이 댓글을 삭제할까요?")) return
    setActionPending(true)
    setError(null)
    const result = await deleteNoticeComment(commentId)
    setActionPending(false)
    if (result.ok) {
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <section className="ledger-surface p-4 md:p-8 border border-border">
        <h2 className="font-mono text-xs md:text-sm font-bold tracking-widest text-muted-foreground uppercase mb-4 md:mb-6">
          댓글 ({totalCount})
        </h2>
      <ul className="space-y-4 mb-6 md:mb-8">
        {displayComments.map((c) => (
          <li key={c.id} className="py-3 border-b border-border last:border-b-0">
            {editingId === c.id ? (
              <div className="space-y-2">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value.slice(0, 500))}
                  rows={3}
                  className="w-full bg-background border border-border p-3 font-mono text-sm focus:border-primary outline-none resize-none"
                />
                <div className="flex items-center justify-between mt-1">
<p className="font-mono text-sm text-muted-foreground">
                  {c.userName ?? "익명"} · {new Date(c.createdAt).toLocaleString("ko-KR")}
                </p>
                <div className="flex gap-2 text-sm font-mono">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(c.id)}
                      disabled={actionPending || !editingContent.trim()}
                      className="px-3 py-1 border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={actionPending}
                      className="px-3 py-1 border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.content}</p>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-mono text-sm text-muted-foreground">
                    {c.userName ?? "익명"} · {new Date(c.createdAt).toLocaleString("ko-KR")}
                  </p>
                  {currentUserId && !c.id.startsWith("opt-") && (
                    <div className="flex gap-2 text-sm font-mono text-muted-foreground">
                      {c.userId === currentUserId && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="hover:text-foreground"
                            disabled={actionPending}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="hover:text-destructive"
                            disabled={actionPending}
                          >
                            삭제
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                        className="hover:text-foreground"
                        disabled={actionPending}
                      >
                        답글
                      </button>
                    </div>
                  )}
                </div>
                {replyingToId === c.id && (
                  <div className="mt-3 pl-4 border-l-2 border-border">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value.slice(0, 500))}
                      placeholder="답글을 입력하세요."
                      rows={2}
                      className="w-full bg-background border border-border p-2 font-mono text-sm focus:border-primary outline-none resize-none"
                    />
                    <div className="mt-2 flex gap-2 text-sm font-mono">
                      <button
                        type="button"
                        onClick={() => handleReplySubmit(c.id)}
                        disabled={replyPending || !replyContent.trim()}
                        className="px-3 py-1 border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                      >
                        {replyPending ? "등록 중…" : "답글 등록"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReplyingToId(null); setReplyContent("") }}
                        disabled={replyPending}
                        className="px-3 py-1 border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
                {(c.replies?.length ?? 0) > 0 && (
                  <ul className="mt-3 pl-4 border-l-2 border-muted space-y-2">
                    {c.replies!.map((r) => (
                      <li key={r.id}>
                        {editingId === r.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value.slice(0, 500))}
                              rows={2}
                              className="w-full bg-background border border-border p-2 font-mono text-sm focus:border-primary outline-none resize-none"
                            />
<div className="flex gap-2 text-sm font-mono">
                            <button
                                type="button"
                                onClick={() => handleSaveEdit(r.id)}
                                disabled={actionPending || !editingContent.trim()}
                                className="px-3 py-1 border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={actionPending}
                                className="px-3 py-1 border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.content}</p>
                        <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-mono text-sm text-muted-foreground">
                            {r.userName ?? "익명"} · {new Date(r.createdAt).toLocaleString("ko-KR")}
                          </p>
                          {currentUserId && r.userId === currentUserId && (
                            <div className="flex gap-2 text-sm font-mono text-muted-foreground">
                              <button
                                type="button"
                                onClick={() => { setEditingId(r.id); setEditingContent(r.content) }}
                                className="hover:text-foreground"
                                disabled={actionPending}
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(r.id)}
                                className="hover:text-destructive"
                                disabled={actionPending}
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
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
