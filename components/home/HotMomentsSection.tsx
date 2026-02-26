"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { EmblemImage } from "@/components/ui/EmblemImage"
import { MomentCommentModal } from "./MomentCommentModal"

export type HotMomentItem = {
  rank: number
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

type Props = {
  hotMoments?: HotMomentItem[]
  title?: string
}

export function HotMomentsSection({ hotMoments = [], title = "HOT MOMENTS OF FOCUS ROUND" }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMoment, setSelectedMoment] = useState<HotMomentItem | null>(null)

  // 포커스 라운드에 속한 실제 모멘트만 표시 (가짜 데이터 없음)
  const list = hotMoments

  const openModal = (m: HotMomentItem) => {
    setSelectedMoment(m)
    setModalOpen(true)
  }

  if (list.length === 0) return null

  return (
    <>
      <section className="mb-8 md:mb-12">
        <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
          {title}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {list.map((m) => (
            <button
              type="button"
              key={m.rank}
              onClick={() => openModal(m)}
              className="hot-moment-card block w-full text-left cursor-pointer"
            >
              <div className="rank-badge">{m.rank}</div>
              <div className="text-[8px] md:text-[10px] text-muted-foreground font-mono mb-1 md:mb-2">
                {m.league}
              </div>
              <div className="font-black italic text-xs md:text-sm mb-1 flex items-center gap-1 md:gap-2">
                <EmblemImage src={m.homeEmblem} width={16} height={16} className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                <span className="hidden md:inline">{m.homeName}</span>
                <span className="mx-0.5">vs</span>
                <EmblemImage src={m.awayEmblem} width={16} height={16} className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                <span className="hidden md:inline">{m.awayName}</span>
              </div>
              <div className="text-primary font-bold font-mono text-[10px] md:text-xs mb-2 md:mb-3">
                {m.time}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] md:text-[10px] font-mono text-muted-foreground">
                  VAR {m.varCount.toLocaleString()}
                </span>
                <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-mono text-muted-foreground">
                  <MessageCircle className="size-3 md:size-[10px]" />
                  <span>{m.commentCount}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <MomentCommentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        moment={selectedMoment}
      />
    </>
  )
}
