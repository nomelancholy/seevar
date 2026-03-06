"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { setReviewStatus, replaceReviewWithCute } from "@/lib/actions/admin-reports"
import { getMatchDetailPath } from "@/lib/match-url"

type Review = {
  id: string
  comment: string | null
  rating: number
  status: string
  moderationFlagged: boolean | null
  moderationScores: Record<string, number> | null
  createdAt: Date
  user: { id: string; name: string | null; email: string | null }
  referee: { id: string; name: string }
  match: {
    id: string
    roundOrder: number
    round: {
      slug: string
      league: { slug: string; season: { year: number } }
    }
  }
}

type Props = { reviews: Review[] }

export function AdminReviewList({ reviews }: Props) {
  const router = useRouter()
  const [actingId, setActingId] = useState<string | null>(null)

  async function handleHide(id: string) {
    if (!confirm("이 한줄평을 숨김 처리할까요? 작성자에게 알림이 갑니다.")) return
    setActingId(id)
    const result = await setReviewStatus(id, "HIDDEN", "관리자 숨김 처리")
    setActingId(null)
    if (result.ok) router.refresh()
    else alert(result.error)
  }

  async function handleReplaceCute(id: string) {
    if (!confirm("이 한줄평을 귀여운 글로 바꿀까요? 작성자에게 알림이 갑니다.")) return
    setActingId(id)
    const result = await replaceReviewWithCute(id)
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

  if (reviews.length === 0) {
    return (
      <div className="ledger-surface border border-border p-8 text-center font-mono text-muted-foreground">
        등록된 한줄평이 없습니다.
      </div>
    )
  }

  return (
    <div className="ledger-surface border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {reviews.map((r) => {
          const matchPath = getMatchDetailPath({
            roundOrder: r.match.roundOrder,
            round: r.match.round as { slug: string; league: { slug: string; season: { year: number } } },
          })
          return (
            <div key={r.id} className="p-4 md:p-5 space-y-2">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <span>{formatDate(r.createdAt)}</span>
                <span>·</span>
                <span>{r.user.name ?? r.user.email ?? r.user.id}</span>
                <span>·</span>
                <span>{r.referee.name}</span>
                <span>·</span>
                <span>별점 {r.rating}</span>
                <span>·</span>
                <span>상태: {r.status}</span>
                {r.moderationFlagged != null && (
                  <>
                    <span>·</span>
                    <span className={r.moderationFlagged ? "text-amber-500" : ""}>
                      Moderation: {r.moderationFlagged ? "flagged" : "ok"}
                    </span>
                  </>
                )}
              </div>
              {r.moderationScores != null && (
                <p className="font-mono text-[10px] text-muted-foreground truncate" title={`OpenAI Moderation: 0~1 확률, 낮을수록 안전\n${JSON.stringify(r.moderationScores)}`}>
                  Moderation 점수(0~1, 낮을수록 안전): {scoresPreview(r.moderationScores)}
                </p>
              )}
              <p className="text-sm break-words">{r.comment ?? "—"}</p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href={matchPath} className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline">
                  경기에서 보기
                </Link>
                {r.status === "VISIBLE" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleHide(r.id)}
                      disabled={actingId === r.id}
                      className="text-[10px] font-mono uppercase tracking-wider text-destructive hover:underline disabled:opacity-50"
                    >
                      {actingId === r.id ? "처리 중…" : "숨김 처리"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReplaceCute(r.id)}
                      disabled={actingId === r.id || !(r.comment ?? "").trim()}
                      className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
                    >
                      {actingId === r.id ? "처리 중…" : "귀여운 글로 바꾸기"}
                    </button>
                  </>
                )}
                {r.status !== "VISIBLE" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("이 한줄평을 다시 노출할까요?")) return
                      setActingId(r.id)
                      const result = await setReviewStatus(r.id, "VISIBLE", null)
                      setActingId(null)
                      if (result.ok) router.refresh()
                      else alert(result.error)
                    }}
                    disabled={actingId === r.id}
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
