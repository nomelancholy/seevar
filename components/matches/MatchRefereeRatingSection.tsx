"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createRefereeReview } from "@/lib/actions/referee-reviews"

const STAR_CLIP =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"

function StarRatingInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hoverStar, setHoverStar] = useState<number | null>(null)
  const displayUpTo = hoverStar != null ? hoverStar : value
  return (
    <div
      className="flex justify-start gap-1.5"
      aria-label="별점"
      onMouseLeave={() => setHoverStar(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayUpTo >= star
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverStar(star)}
            className="relative w-6 h-6 shrink-0 p-0 border-0 bg-transparent cursor-pointer"
            style={{ clipPath: STAR_CLIP }}
            aria-label={`${star}점`}
          >
            <span
              className={`absolute inset-0 block transition-colors ${filled ? "bg-primary" : "bg-muted-foreground/40"}`}
              style={{ clipPath: STAR_CLIP }}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}

function StarRatingDisplay({ rating, size = "normal" }: { rating: number; size?: "normal" | "small" }) {
  const sizeClass = size === "small" ? "w-3 h-3" : "w-5 h-5"
  return (
    <div className="flex justify-start gap-0.5 items-center" aria-label={`${rating}점`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const leftVal = i + 0.5
        const rightVal = i + 1
        const fill =
          rating >= rightVal ? 100 : rating >= leftVal ? 50 : 0
        return (
          <div
            key={i}
            className={`relative shrink-0 ${sizeClass}`}
            style={{ clipPath: STAR_CLIP }}
          >
            <span
              className="absolute inset-0 block bg-muted-foreground/40"
              style={{ clipPath: STAR_CLIP }}
              aria-hidden
            />
            <span className="absolute inset-0 overflow-hidden" aria-hidden>
              <span
                className="absolute left-0 top-0 h-full bg-primary"
                style={{ width: `${fill}%`, clipPath: STAR_CLIP }}
              />
            </span>
          </div>
        )
      })}
    </div>
  )
}

const ROLE_LABEL: Record<string, string> = {
  MAIN: "Main",
  ASSISTANT: "Asst",
  WAITING: "4th",
  VAR: "VAR",
}

type RefereeItem = {
  id: string
  role: string
  referee: { id: string; name: string; slug: string }
}

type ReviewItem = {
  id: string
  refereeId: string
  userId: string
  rating: number
  comment: string | null
  user: { name: string | null }
  fanTeamId: string | null
  fanTeam: { name: string; emblemPath: string | null } | null
}

type Props = {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  matchReferees: RefereeItem[]
  reviews: ReviewItem[]
  currentUserId: string | null
}

export function MatchRefereeRatingSection({
  matchId,
  homeTeamId,
  awayTeamId,
  matchReferees,
  reviews: initialReviews,
  currentUserId,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const reviews = initialReviews

  useEffect(() => {
    setRating(0)
    setComment("")
    setError(null)
  }, [selectedIdx])

  const selected = matchReferees[selectedIdx]
  const selectedRefereeId = selected?.referee.id
  const selectedReviews = selectedRefereeId
    ? reviews.filter((r) => r.refereeId === selectedRefereeId)
    : []
  const myReview = currentUserId
    ? selectedReviews.find((r) => r.userId === currentUserId)
    : null
  const avgRating =
    selectedReviews.length > 0
      ? selectedReviews.reduce((s, r) => s + r.rating, 0) / selectedReviews.length
      : null
  const count = selectedReviews.length

  const homeFanReviews = selectedReviews.filter((r) => r.fanTeamId === homeTeamId)
  const awayFanReviews = selectedReviews.filter((r) => r.fanTeamId === awayTeamId)
  const thirdFanReviews = selectedReviews.filter(
    (r) => r.fanTeamId != null && r.fanTeamId !== homeTeamId && r.fanTeamId !== awayTeamId
  )
  const avgHome =
    homeFanReviews.length > 0
      ? homeFanReviews.reduce((s, r) => s + r.rating, 0) / homeFanReviews.length
      : null
  const avgAway =
    awayFanReviews.length > 0
      ? awayFanReviews.reduce((s, r) => s + r.rating, 0) / awayFanReviews.length
      : null
  const avgThird =
    thirdFanReviews.length > 0
      ? thirdFanReviews.reduce((s, r) => s + r.rating, 0) / thirdFanReviews.length
      : null

  const handleSubmit = async () => {
    if (!selected || !currentUserId) return
    if (rating < 1 || rating > 5) {
      setError("평점을 선택해주세요.")
      return
    }
    setPending(true)
    setError(null)
    const result = await createRefereeReview(
      matchId,
      selected.referee.id,
      selected.role as "MAIN" | "ASSISTANT" | "VAR" | "WAITING",
      rating,
      comment || null
    )
    setPending(false)
    if (result.ok) {
      setRating(0)
      setComment("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  if (matchReferees.length === 0) return null

  return (
    <div className="mb-8 border border-border bg-card/50">
      <div className="border-b border-border px-4 md:px-6 py-3">
        <span className="font-mono text-xs font-black tracking-widest text-primary uppercase">
          REFEREE RATING
        </span>
      </div>
      <div className="p-4 md:p-8">
        <p className="font-mono text-[8px] md:text-[9px] text-muted-foreground italic mb-6">
          * 각 심판별로 팬들의 평가와 한줄평을 확인하세요.
        </p>

        {/* Referee selector */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-8">
          {matchReferees.map((mr, idx) => (
            <button
              key={mr.id}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`text-left p-3 border transition-colors ${
                idx === selectedIdx
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card/30 hover:border-muted-foreground/50"
              }`}
            >
              <p className="text-[7px] md:text-[8px] font-mono text-muted-foreground uppercase">
                {ROLE_LABEL[mr.role] ?? mr.role}
              </p>
              <p className="text-[10px] md:text-xs font-bold truncate">{mr.referee.name}</p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Rate this referee + Community summary */}
            <div className="lg:col-span-1 space-y-6">
              {currentUserId && !myReview && (
                <div className="bg-muted/30 border border-border p-4 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] md:text-[10px] font-black font-mono text-primary uppercase">
                      Rate this Referee
                    </span>
                    <span className="bg-muted text-primary px-2 py-0.5 text-[7px] md:text-[8px] font-mono">
                      PENDING
                    </span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-mono mb-2">
                        {ROLE_LABEL[selected.role]}: {selected.referee.name}
                      </p>
                      <StarRatingInput value={rating} onChange={setRating} />
                    </div>
                    <div>
                      <label className="block text-[8px] md:text-[9px] text-muted-foreground uppercase font-mono mb-2">
                        Short Review
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, 100))}
                        rows={3}
                        placeholder="한줄평을 입력해주세요 (예: 판정이 공정했습니다)"
                        className="w-full bg-background border border-border p-3 text-[10px] md:text-xs font-mono focus:border-primary outline-none resize-none"
                      />
                    </div>
                    {error && (
                      <p className="text-destructive text-[10px] font-mono">{error}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={pending || rating < 1}
                      className="w-full border border-primary bg-primary text-primary-foreground font-black py-3 text-[9px] md:text-[10px] tracking-tighter italic uppercase hover:opacity-90 disabled:opacity-50"
                    >
                      {pending ? "저장 중..." : "SUBMIT RATING"}
                    </button>
                  </div>
                </div>
              )}
              {currentUserId && myReview && (
                <div className="bg-muted/30 border border-border p-4 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black font-mono text-blue-500 uppercase">
                      My Rating
                    </span>
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 text-[8px] font-mono">
                      SUBMITTED
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {ROLE_LABEL[selected.role]}: {selected.referee.name}
                    </p>
                    <StarRatingDisplay rating={myReview.rating} />
                    {myReview.comment && (
                      <p className="text-sm text-muted-foreground italic">&quot;{myReview.comment}&quot;</p>
                    )}
                  </div>
                </div>
              )}
              {!currentUserId && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  로그인하면 심판 평점을 남길 수 있습니다.
                </p>
              )}

              {/* Community Summary */}
              <div className="space-y-4">
                <h4 className="text-[9px] md:text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest">
                  Community Summary
                </h4>
                <div className="flex items-end gap-4 flex-wrap">
                  <span className="text-4xl md:text-5xl font-black italic tracking-tighter">
                    {avgRating != null ? avgRating.toFixed(1) : "—"}
                  </span>
                  {avgRating != null && (
                    <div className="flex items-center gap-2 mb-1">
                      <StarRatingDisplay rating={avgRating} size="small" />
                    </div>
                  )}
                  <div className="w-full basis-full" />
                  <span className="text-[7px] md:text-[8px] font-mono text-muted-foreground">
                    BASED ON {count} RATING{count !== 1 ? "S" : ""}
                  </span>
                </div>
                {/* Fan breakdown */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] md:text-[9px] font-mono text-muted-foreground shrink-0 w-36">
                      홈팀 팬 평점 종합
                    </span>
                    <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${avgHome != null ? (avgHome / 5) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums w-8 text-right">
                      {avgHome != null ? avgHome.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] md:text-[9px] font-mono text-muted-foreground shrink-0 w-36">
                      원정팀 팬 평점 종합
                    </span>
                    <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${avgAway != null ? (avgAway / 5) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums w-8 text-right">
                      {avgAway != null ? avgAway.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] md:text-[9px] font-mono text-muted-foreground shrink-0 w-36">
                      제3자 팀팬 평점 종합
                    </span>
                    <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${avgThird != null ? (avgThird / 5) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums w-8 text-right">
                      {avgThird != null ? avgThird.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Community Feedbacks */}
            <div className="lg:col-span-2">
              <h4 className="text-[9px] md:text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest mb-4">
                Community Feedbacks
              </h4>
              <div className="space-y-0 border border-border bg-black/20 max-h-[400px] overflow-y-auto">
                {selectedReviews.length === 0 ? (
                  <div className="p-8 text-center font-mono text-[10px] text-muted-foreground">
                    아직 평가가 없습니다.
                  </div>
                ) : (
                  selectedReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 md:p-6 border-b border-border last:border-b-0"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] md:text-xs font-bold text-muted-foreground">
                            {rev.user.name ?? "Anonymous"}
                          </span>
                          {rev.fanTeam && (
                            <span className="text-[8px] font-mono text-muted-foreground">
                              {rev.fanTeam.name}
                            </span>
                          )}
                        </div>
                        <StarRatingDisplay rating={rev.rating} size="small" />
                      </div>
                      {rev.comment && (
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                          &quot;{rev.comment}&quot;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
