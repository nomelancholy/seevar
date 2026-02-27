"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setCommentStatus, setReviewStatus } from "@/lib/actions/admin-reports"

const REASON_LABEL: Record<string, string> = {
  ABUSE: "욕설·비하",
  SPAM: "도배·광고",
  INAPPROPRIATE: "부적절한 게시물",
  FALSE_INFO: "허위 사실",
}

type Report = {
  id: string
  reason: string
  description: string | null
  createdAt: Date
  reporter: { id: string; name: string | null; email: string | null }
  review: {
    id: string
    rating: number
    comment: string | null
    status: string
    referee: { name: string }
  } | null
  comment: {
    id: string
    content: string
    status: string
    moment: { id: string; title: string | null }
  } | null
}

type Props = { reports: Report[] }

export function AdminReportList({ reports }: Props) {
  const router = useRouter()
  const [actingId, setActingId] = useState<string | null>(null)

  async function handleHideComment(commentId: string, reasonLabel: string) {
    if (!confirm("이 댓글을 숨김 처리할까요? (사유가 저장되어 게시물에 표시됩니다)")) return
    setActingId(commentId)
    const result = await setCommentStatus(commentId, "HIDDEN", reasonLabel)
    setActingId(null)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  async function handleHideReview(reviewId: string, reasonLabel: string) {
    if (!confirm("이 심판 평가를 숨김 처리할까요? (사유가 저장되어 게시물에 표시됩니다)")) return
    setActingId(reviewId)
    const result = await setReviewStatus(reviewId, "HIDDEN", reasonLabel)
    setActingId(null)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  async function handleRestoreComment(commentId: string) {
    if (!confirm("이 댓글을 다시 노출할까요? (재심 통과)")) return
    setActingId(commentId)
    const result = await setCommentStatus(commentId, "VISIBLE", null)
    setActingId(null)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  async function handleRestoreReview(reviewId: string) {
    if (!confirm("이 심판 평가를 다시 노출할까요? (재심 통과)")) return
    setActingId(reviewId)
    const result = await setReviewStatus(reviewId, "VISIBLE", null)
    setActingId(null)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  function formatDate(d: Date) {
    return new Date(d).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (reports.length === 0) {
    return (
      <div className="ledger-surface border border-border p-8 text-center font-mono text-muted-foreground">
        접수된 신고가 없습니다.
      </div>
    )
  }

  return (
    <div className="ledger-surface border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {reports.map((r) => (
          <div key={r.id} className="p-4 md:p-6 space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <span>{formatDate(r.createdAt)}</span>
              <span>·</span>
              <span>신고 사유: {REASON_LABEL[r.reason] ?? r.reason}</span>
              <span>·</span>
              <span>신고자: {r.reporter.name ?? r.reporter.email ?? r.reporter.id}</span>
            </div>
            {r.description && (
              <p className="font-mono text-xs text-muted-foreground italic">
                &quot;{r.description}&quot;
              </p>
            )}
            {r.comment && (
              <div className="bg-muted/30 border border-border p-3 rounded space-y-1">
                <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
                  댓글 (상태: {r.comment.status})
                </p>
                <p className="text-sm break-words">{r.comment.content}</p>
                {r.comment.status === "PENDING_REAPPROVAL" && (
                  <p className="font-mono text-[10px] text-emerald-400">
                    · 작성자가 내용을 수정하여 재심을 요청한 상태입니다.
                  </p>
                )}
                {r.comment.status === "VISIBLE" && (
                  <button
                    type="button"
                    onClick={() => handleHideComment(r.comment!.id, REASON_LABEL[r.reason] ?? r.reason)}
                    disabled={actingId === r.comment!.id}
                    className="mt-2 text-[10px] font-mono uppercase tracking-wider text-destructive hover:underline disabled:opacity-50"
                  >
                    {actingId === r.comment.id ? "처리 중..." : "숨김 처리"}
                  </button>
                )}
                {r.comment.status !== "VISIBLE" && (
                  <button
                    type="button"
                    onClick={() => handleRestoreComment(r.comment!.id)}
                    disabled={actingId === r.comment!.id}
                    className="mt-2 text-[10px] font-mono uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                  >
                    {actingId === r.comment.id ? "처리 중..." : "재노출 (재심 통과)"}
                  </button>
                )}
              </div>
            )}
            {r.review && (
              <div className="bg-muted/30 border border-border p-3 rounded space-y-1">
                <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">
                  심판 평가 · {r.review.referee.name} (상태: {r.review.status})
                </p>
                <p className="text-sm">
                  별점 {r.review.rating} · {r.review.comment ?? "—"}
                </p>
                {r.review.status === "PENDING_REAPPROVAL" && (
                  <p className="font-mono text-[10px] text-emerald-400">
                    · 작성자가 평점을 수정하여 재심을 요청한 상태입니다.
                  </p>
                )}
                {r.review.status === "VISIBLE" && (
                  <button
                    type="button"
                    onClick={() => handleHideReview(r.review!.id, REASON_LABEL[r.reason] ?? r.reason)}
                    disabled={actingId === r.review!.id}
                    className="mt-2 text-[10px] font-mono uppercase tracking-wider text-destructive hover:underline disabled:opacity-50"
                  >
                    {actingId === r.review.id ? "처리 중..." : "숨김 처리"}
                  </button>
                )}
                {r.review.status !== "VISIBLE" && (
                  <button
                    type="button"
                    onClick={() => handleRestoreReview(r.review!.id)}
                    disabled={actingId === r.review!.id}
                    className="mt-2 text-[10px] font-mono uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                  >
                    {actingId === r.review.id ? "처리 중..." : "재노출 (재심 통과)"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
