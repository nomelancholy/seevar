"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle } from "lucide-react"
import { MomentCommentModal } from "@/components/home/MomentCommentModal"
import { formatMatchMinuteForDisplay, formatMomentTimeFromPeriod } from "@/lib/utils/format-match-minute"

export type MomentForCard = {
  id: string
  title: string | null
  description?: string | null
  startMinute: number | null
  /** 구간(전반/후반/연장). 후반 47분 vs 연장 전반 2분 구분용 */
  startPeriod?: string | null
  /** 구간 내 분. startPeriod와 함께 표기 시 사용 */
  startMinuteInPeriod?: number | null
  endMinute: number | null
  seeVarCount: number
  commentCount: number
  /** 첫 댓글 내용 일부 (카드 미리보기용) */
  firstCommentPreview?: string | null
}

export type MatchInfoForCards = {
  homeTeam: { name: string; emblemPath: string | null }
  awayTeam: { name: string; emblemPath: string | null }
  round: { league: { name: string } }
}

type HotMomentItem = {
  momentId?: string
  matchId: string
  league: string
  homeName: string
  awayName: string
  homeEmblem: string
  awayEmblem: string
  time: string
  varCount: number
  commentCount: number
}

/** useRef 제네릭의 >> 가 JSX로 파싱되지 않도록 별칭 사용 */
type CardRefsMap = Record<string, HTMLButtonElement | null>

/** 상황 발생 시각 표기. startPeriod+startMinuteInPeriod 있으면 우선 사용(90+2→후반 47분 vs 연장 전반 2분 구분) */
function getMomentTimeLabel(mom: MomentForCard): string {
  if (mom.startPeriod != null && mom.startPeriod !== "" && mom.startMinuteInPeriod != null)
    return formatMomentTimeFromPeriod(mom.startPeriod, mom.startMinuteInPeriod)
  if (mom.startMinute != null) return formatMatchMinuteForDisplay(mom.startMinute)
  return mom.title ?? "—"
}

function toHotMomentItem(
  mom: MomentForCard,
  matchId: string,
  match: MatchInfoForCards
): HotMomentItem {
  const time = getMomentTimeLabel(mom)
  return {
    momentId: mom.id,
    matchId,
    league: match.round.league.name,
    homeName: match.homeTeam.name,
    awayName: match.awayTeam.name,
    homeEmblem: match.homeTeam.emblemPath ?? "",
    awayEmblem: match.awayTeam.emblemPath ?? "",
    time,
    varCount: mom.seeVarCount,
    commentCount: mom.commentCount,
  }
}

type Props = {
  moments: MomentForCard[]
  match: MatchInfoForCards
  matchId: string
  /** Moments list page: grid + description */
  variant?: "hot" | "list"
  /** 알림 등에서 진입 시 이 모멘트 카드 열기 + 스크롤 */
  initialOpenMomentId?: string
}

export function MatchMomentCards({
  moments,
  match,
  matchId,
  variant = "hot",
  initialOpenMomentId,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<HotMomentItem | null>(null)
  const cardRefs = useRef<CardRefsMap>({})

  const openModal = (item: HotMomentItem) => {
    setSelected(item)
    setModalOpen(true)
  }

  const didOpenInitial = useRef(false)
  useEffect(() => {
    if (!initialOpenMomentId || moments.length === 0 || didOpenInitial.current) return
    const mom = moments.find((m) => m.id === initialOpenMomentId)
    if (!mom) return
    didOpenInitial.current = true
    const item = toHotMomentItem(mom, matchId, match)
    setSelected(item)
    setModalOpen(true)
    requestAnimationFrame(() => {
      const el = cardRefs.current[initialOpenMomentId]
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }, [initialOpenMomentId, moments, matchId, match])

  if (moments.length === 0) return null

  const gridClass =
    variant === "list"
      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      : "grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4"

  return (
    <>
      <div className={gridClass}>
        {moments.map((mom, i) => {
          const item = toHotMomentItem(mom, matchId, match)
          const cardClass =
            variant === "list"
              ? "ledger-surface p-4 rounded-md border border-border hover:border-primary transition-colors text-left cursor-pointer w-full"
              : "hot-moment-card block w-full text-left cursor-pointer"

          return (
            <button
              key={mom.id}
              ref={(el) => {
                cardRefs.current[mom.id] = el
              }}
              type="button"
              onClick={() => openModal(item)}
              className={cardClass}
            >
              {variant === "list" && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-primary font-bold">
                    {getMomentTimeLabel(mom)}
                  </span>
                  {i < 3 && (
                    <span className="bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.5">
                      HOT
                    </span>
                  )}
                </div>
              )}
              {variant === "hot" && (
                <>
                  <div className="rank-badge">{i + 1}</div>
                  <div className="text-primary font-bold font-mono text-[10px] md:text-xs mb-2 md:mb-3">
                    {getMomentTimeLabel(mom)}
                  </div>
                  {mom.firstCommentPreview && (
                    <p className="text-xs md:text-sm text-white line-clamp-2 mb-2 not-italic">
                      {mom.firstCommentPreview}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] md:text-[10px] font-mono text-muted-foreground">
                      이의 제기 {mom.seeVarCount.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-mono text-muted-foreground">
                      <MessageCircle className="size-3 md:size-[10px]" />
                      <span>{mom.commentCount}</span>
                    </div>
                  </div>
                </>
              )}
              {variant === "list" && mom.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {mom.description}
                </p>
              )}
              {variant === "list" && (
                <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                  <span>이의 제기 {mom.seeVarCount.toLocaleString()}</span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="size-3" />
                    {mom.commentCount}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <MomentCommentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        moment={selected}
      />
    </>
  )
}
