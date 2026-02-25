"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { MomentCommentModal } from "@/components/home/MomentCommentModal"

export type MomentForCard = {
  id: string
  title: string | null
  description?: string | null
  startMinute: number | null
  endMinute: number | null
  seeVarCount: number
  commentCount: number
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

function toHotMomentItem(
  mom: MomentForCard,
  matchId: string,
  match: MatchInfoForCards
): HotMomentItem {
  const time =
    mom.startMinute != null && mom.endMinute != null
      ? `${mom.startMinute}' ~ ${mom.endMinute}'`
      : mom.title ?? ""
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
}

export function MatchMomentCards({
  moments,
  match,
  matchId,
  variant = "hot",
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<HotMomentItem | null>(null)

  const openModal = (item: HotMomentItem) => {
    setSelected(item)
    setModalOpen(true)
  }

  if (moments.length === 0) return null

  // SEE VAR 수 상위 5개 id (hot variant에서 HOT 태그용)
  const hotMomentIds = new Set(
    [...moments]
      .sort((a, b) => (b.seeVarCount ?? 0) - (a.seeVarCount ?? 0))
      .slice(0, 5)
      .map((m) => m.id)
  )

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
          const isHot = variant === "hot" && hotMomentIds.has(mom.id)

          return (
            <button
              key={mom.id}
              type="button"
              onClick={() => openModal(item)}
              className={cardClass}
            >
              {variant === "list" && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-primary font-bold">
                    {mom.title ?? `${mom.startMinute ?? 0}' ~ ${mom.endMinute ?? 0}'`}
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
                  {isHot && (
                    <div className="absolute -top-2.5 -left-2.5 bg-primary text-primary-foreground font-black italic px-2 py-0.5 text-[10px] z-10">
                      HOT
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs md:text-sm font-mono font-semibold text-foreground mb-1.5">
                    <span>SEE VAR {mom.seeVarCount.toLocaleString()}</span>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="size-4" />
                      {mom.commentCount}
                    </span>
                  </div>
                  <div className="text-primary font-bold font-mono text-[10px] md:text-xs">
                    {mom.startMinute != null && mom.endMinute != null
                      ? `${mom.startMinute}' ~ ${mom.endMinute}'`
                      : mom.title ?? "—"}
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
                  <span>SEE VAR {mom.seeVarCount.toLocaleString()}</span>
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
