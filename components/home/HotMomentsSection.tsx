"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
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

const FALLBACK_MOMENTS: HotMomentItem[] = [
  { rank: 1, matchId: "", league: "K LEAGUE 1", homeName: "서울", awayName: "울산", homeEmblem: "/assets/emblem/2026/kleague1/fc_seoul.svg", awayEmblem: "/assets/emblem/2026/kleague1/ulsan_hd_fc.svg", time: "52' ~ 54'", varCount: 1240, commentCount: 24 },
  { rank: 2, matchId: "", league: "K LEAGUE 1", homeName: "인천", awayName: "부천", homeEmblem: "/assets/emblem/2026/kleague1/incheon_united_fc.svg", awayEmblem: "/assets/emblem/2026/kleague1/bucheon_fc_1995.svg", time: "24' ~ 26'", varCount: 980, commentCount: 18 },
  { rank: 3, matchId: "", league: "K LEAGUE 1", homeName: "전북", awayName: "광주", homeEmblem: "/assets/emblem/2026/kleague1/jeonbuk_hyundai_motors.svg", awayEmblem: "/assets/emblem/2026/kleague1/gwangju_fc.svg", time: "15' ~ 18'", varCount: 850, commentCount: 12 },
  { rank: 4, matchId: "", league: "K LEAGUE 2", homeName: "안양", awayName: "부산", homeEmblem: "/assets/emblem/2026/kleague1/fc_anyang.svg", awayEmblem: "/assets/emblem/2026/kleague2/busan_ipark.svg", time: "82' ~ 85'", varCount: 720, commentCount: 31 },
  { rank: 5, matchId: "", league: "K LEAGUE 1", homeName: "포항", awayName: "제주", homeEmblem: "/assets/emblem/2026/kleague1/pohang_steelers.svg", awayEmblem: "/assets/emblem/2026/kleague1/jeju_sk_fc.svg", time: "40' ~ 42'", varCount: 640, commentCount: 15 },
]

type Props = {
  hotMoments?: HotMomentItem[]
  title?: string
}

export function HotMomentsSection({ hotMoments = [], title = "HOT MOMENTS OF FOCUS ROUND" }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMoment, setSelectedMoment] = useState<HotMomentItem | null>(null)

  const list = hotMoments.length > 0 ? hotMoments : FALLBACK_MOMENTS

  const openModal = (m: HotMomentItem) => {
    setSelectedMoment(m)
    setModalOpen(true)
  }

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
                <img src={m.homeEmblem} alt="" className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">{m.homeName}</span>
                <span className="mx-0.5">vs</span>
                <img src={m.awayEmblem} alt="" className="w-3 h-3 md:w-4 md:h-4" />
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
