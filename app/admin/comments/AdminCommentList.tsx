"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { setCommentStatus, replaceCommentWithCute } from "@/lib/actions/admin-reports"
import { getMatchDetailPath } from "@/lib/match-url"

type Comment = {
  id: string
  content: string
  status: string
  mediaUrl: string | null
  moderationFlagged: boolean | null
  moderationScores: Record<string, number> | null
  createdAt: Date
  author: { id: string; name: string | null; email: string | null }
  moment: {
    id: string
    matchId: string
    match: {
      roundOrder: number
      round: {
        slug: string
        league: { slug: string; season: { year: number } }
      }
    }
  } | null
}

type Props = { comments: Comment[] }

export function AdminCommentList({ comments }: Props) {
  const router = useRouter()
  const [actingId, setActingId] = useState<string | null>(null)

  async function handleHide(id: string) {
    if (!confirm("이 댓글을 숨김 처리할까요? 작성자에게 알림이 갑니다.")) return
    setActingId(id)
    const result = await setCommentStatus(id, "HIDDEN", "관리자 숨김 처리")
    setActingId(null)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  async function handleReplaceCute(id: string) {
    if (!confirm("이 댓글을 귀여운 댓글로 바꿀까요? 작성자에게 알림이 갑니다.")) return
    setActingId(id)
    const result = await replaceCommentWithCute(id)
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

  /** OpenAI Moderation API: 0~1 확률(해당 카테고리 해당 확률). 낮을수록 안전. */
  function scoresPreview(scores: Record<string, number> | null) {
    if (!scores || typeof scores !== "object") return "—"
    const entries = Object.entries(scores)
      .filter(([, v]) => typeof v === "number")
      .sort((a, b) => (b[1] as number) - (a[1] as number))
    const maxScore = entries[0]?.[1] ?? 0
    const maxLabel = entries[0]?.[0] ?? ""
    const summary =
      maxScore < 0.1
        ? `안전 (최고: ${maxLabel} ${maxScore.toFixed(2)})`
        : maxScore >= 0.5
          ? `자동 치환됨 (${maxLabel} ${maxScore.toFixed(2)})`
          : entries
              .slice(0, 4)
              .map(([k, v]) => `${k}: ${(v as number).toFixed(2)}`)
              .join(", ")
    return summary
  }

  if (comments.length === 0) {
    return (
      <div className="ledger-surface border border-border p-8 text-center font-mono text-muted-foreground">
        등록된 댓글이 없습니다.
      </div>
    )
  }

  return (
    <div className="ledger-surface border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {comments.map((c) => {
          const matchPath =
            c.moment?.match != null
              ? getMatchDetailPath({
                  roundOrder: c.moment.match.roundOrder,
                  round: c.moment.match.round as { slug: string; league: { slug: string; season: { year: number } } },
                })
              : null
          const openLink = matchPath
            ? `${matchPath}${matchPath.includes("?") ? "&" : "?"}openMoment=${encodeURIComponent(c.moment!.id)}`
            : null
          return (
            <div key={c.id} className="p-4 md:p-5 space-y-2">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <span>{formatDate(c.createdAt)}</span>
                <span>·</span>
                <span>{c.author.name ?? c.author.email ?? c.author.id}</span>
                <span>·</span>
                <span>상태: {c.status}</span>
                {c.moderationFlagged != null && (
                  <>
                    <span>·</span>
                    <span className={c.moderationFlagged ? "text-amber-500" : ""}>
                      Moderation: {c.moderationFlagged ? "flagged" : "ok"}
                    </span>
                  </>
                )}
              </div>
              {c.moderationScores != null && (
                <p className="font-mono text-[10px] text-muted-foreground truncate" title={`OpenAI Moderation: 0~1 확률, 낮을수록 안전\n${JSON.stringify(c.moderationScores)}`}>
                  Moderation 점수(0~1, 낮을수록 안전): {scoresPreview(c.moderationScores)}
                </p>
              )}
              <p className="text-sm break-words line-clamp-2">{c.content}</p>
              {c.mediaUrl && (
                <p className="text-[10px] text-muted-foreground">
                  첨부:{" "}
                  <a
                    href={`/api/admin/download-moment-media?url=${encodeURIComponent(c.mediaUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono uppercase tracking-wider text-primary hover:underline"
                  >
                    첨부파일 다운로드
                  </a>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {openLink && (
                  <Link href={openLink} className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline">
                    경기에서 보기
                  </Link>
                )}
                {c.status === "VISIBLE" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleHide(c.id)}
                      disabled={actingId === c.id}
                      className="text-[10px] font-mono uppercase tracking-wider text-destructive hover:underline disabled:opacity-50"
                    >
                      {actingId === c.id ? "처리 중…" : "숨김 처리"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReplaceCute(c.id)}
                      disabled={actingId === c.id}
                      className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                    >
                      {actingId === c.id ? "처리 중…" : "귀여운 댓글로 바꾸기"}
                    </button>
                  </>
                )}
                {c.status !== "VISIBLE" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("이 댓글을 다시 노출할까요?")) return
                      setActingId(c.id)
                      const result = await setCommentStatus(c.id, "VISIBLE", null)
                      setActingId(null)
                      if (result.ok) router.refresh()
                      else alert(result.error)
                    }}
                    disabled={actingId === c.id}
                    className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                  >
                    재노출
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
