"use client"

import { useMemo, useState } from "react"
import { MessageCircle, ChevronDown, ChevronRight } from "lucide-react"
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
  /** 첫 댓글 내용 일부 (카드 미리보기용) */
  firstCommentPreview?: string
  /** 경기 상세 경로. 있으면 모달에서 공유하기 버튼 노출 */
  matchDetailPath?: string
}

type Props = {
  hotMoments?: HotMomentItem[]
  title?: string
}

/** 경기별로 묶고, 각 경기 안에서 시간대별로 묶음. 1단계: 경기 폴더, 2단계: 시간 폴더 */
type TimeGroup = { timeLabel: string; items: HotMomentItem[] }
type MatchGroup = {
  matchId: string
  matchLabel: string
  league: string
  homeEmblem: string
  awayEmblem: string
  timeGroups: TimeGroup[]
}

function groupByMatchThenTime(list: HotMomentItem[]): MatchGroup[] {
  const byMatch = new Map<string, HotMomentItem[]>()
  for (const m of list) {
    const arr = byMatch.get(m.matchId) ?? []
    arr.push(m)
    byMatch.set(m.matchId, arr)
  }
  const matchGroups: MatchGroup[] = []
  for (const [matchId, items] of byMatch.entries()) {
    const first = items[0]
    const byTime = new Map<string, HotMomentItem[]>()
    for (const m of items) {
      const arr = byTime.get(m.time) ?? []
      arr.push(m)
      byTime.set(m.time, arr)
    }
    const timeGroups: TimeGroup[] = Array.from(byTime.entries()).map(([timeLabel, timeItems]) => ({
      timeLabel,
      items: timeItems,
    }))
    timeGroups.sort(
      (a, b) => Math.min(...a.items.map((i) => i.rank)) - Math.min(...b.items.map((i) => i.rank))
    )
    matchGroups.push({
      matchId,
      matchLabel: `${first.homeName} vs ${first.awayName}`,
      league: first.league,
      homeEmblem: first.homeEmblem,
      awayEmblem: first.awayEmblem,
      timeGroups,
    })
  }
  matchGroups.sort(
    (a, b) =>
      Math.min(...a.timeGroups.flatMap((t) => t.items.map((i) => i.rank))) -
      Math.min(...b.timeGroups.flatMap((t) => t.items.map((i) => i.rank)))
  )
  return matchGroups
}

function MomentCard({
  m,
  displayRank,
  onOpen,
}: {
  m: HotMomentItem
  /** 경기 내 순위 (1, 2, 3, …). 미전달 시 m.rank 사용 */
  displayRank?: number
  onOpen: (item: HotMomentItem) => void
}) {
  const rank = displayRank ?? m.rank
  return (
    <button
      type="button"
      onClick={() => onOpen(m)}
      className="hot-moment-card block w-full min-w-0 text-left cursor-pointer"
    >
      <div className="rank-badge">{rank}</div>
      <div className="text-[8px] md:text-[10px] text-muted-foreground font-mono mb-1 md:mb-2">
        {m.league}
      </div>
      <div className="font-black text-xs md:text-sm mb-1 flex items-center gap-1 md:gap-2 min-w-0 not-italic">
        <EmblemImage src={m.homeEmblem} width={16} height={16} className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
        <span className="truncate">{m.homeName}</span>
        <span className="mx-0.5 shrink-0">vs</span>
        <EmblemImage src={m.awayEmblem} width={16} height={16} className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
        <span className="truncate">{m.awayName}</span>
      </div>
      <div className="text-primary font-bold font-mono text-[10px] md:text-xs mb-2 md:mb-3">
        {m.time}
      </div>
      {m.firstCommentPreview && (
        <p className="text-xs md:text-sm text-white line-clamp-2 mb-2 not-italic">
          {m.firstCommentPreview}
        </p>
      )}
      <div className="flex justify-between items-center">
        <span className="text-[8px] md:text-[10px] font-mono text-muted-foreground">
          이의 제기 {m.varCount.toLocaleString()}
        </span>
        <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-mono text-muted-foreground">
          <MessageCircle className="size-3 md:size-[10px]" />
          <span>{m.commentCount}</span>
        </div>
      </div>
    </button>
  )
}

export function HotMomentsSection({ hotMoments = [], title = "라운드 쟁점 순간" }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMoment, setSelectedMoment] = useState<HotMomentItem | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const list = hotMoments
  const matchGroups = useMemo(() => groupByMatchThenTime(list), [list])

  /** 경기별 카드 넘버링: 각 경기 안에서만 1, 2, 3, … (원본 rank 순) */
  const rankInMatchByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (const match of matchGroups) {
      const allItems = match.timeGroups.flatMap((t) => t.items)
      allItems.sort((a, b) => a.rank - b.rank)
      allItems.forEach((item, idx) => {
        const key = item.momentId ?? `${item.matchId}-${item.time}-${item.rank}`
        map.set(key, idx + 1)
      })
    }
    return map
  }, [matchGroups])

  const openModal = (m: HotMomentItem) => {
    setSelectedMoment(m)
    setModalOpen(true)
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (list.length === 0) return null

  return (
    <>
      <section className="mb-8 md:mb-12">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase mb-6 not-italic">
          {title}
        </h2>
        <div className="space-y-4">
          {matchGroups.map((match) => {
            const matchKey = match.matchId
            const matchCollapsed = collapsedGroups.has(matchKey)
            const totalInMatch = match.timeGroups.reduce((s, t) => s + t.items.length, 0)
            return (
              <div
                key={matchKey}
                className="border border-border rounded-md overflow-hidden bg-card/30"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(matchKey)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left font-mono text-sm md:text-base font-bold bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {matchCollapsed ? (
                    <ChevronRight className="size-4 md:size-5 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4 md:size-5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <EmblemImage
                    src={match.homeEmblem}
                    width={20}
                    height={20}
                    className="w-4 h-4 md:w-5 md:h-5 shrink-0"
                  />
                  <span className="truncate text-foreground">{match.matchLabel}</span>
                  <span className="text-muted-foreground font-normal text-xs md:text-sm shrink-0">
                    ({match.league} · {totalInMatch}건)
                  </span>
                </button>
                {!matchCollapsed && (
                  <div className="border-t border-border bg-card/10">
                    {match.timeGroups.map(({ timeLabel, items }) => {
                      const timeKey = `${matchKey}|${timeLabel}`
                      const timeCollapsed = collapsedGroups.has(timeKey)
                      return (
                        <div key={timeKey} className="border-b border-border last:border-b-0">
                          <button
                            type="button"
                            onClick={() => toggleGroup(timeKey)}
                            className="w-full flex items-center gap-2 pl-6 pr-4 py-2.5 text-left font-mono text-xs md:text-sm font-bold text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                          >
                            {timeCollapsed ? (
                              <ChevronRight className="size-3 md:size-4 shrink-0" aria-hidden />
                            ) : (
                              <ChevronDown className="size-3 md:size-4 shrink-0" aria-hidden />
                            )}
                            <span>{timeLabel}</span>
                            <span className="text-muted-foreground/80 font-normal text-[10px] md:text-xs">
                              ({items.length}건)
                            </span>
                          </button>
                          {!timeCollapsed && (
                            <div className="pl-6 pr-3 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                              {items.map((m) => {
                                const key = m.momentId ?? `${m.matchId}-${m.time}-${m.rank}`
                                const displayRank = rankInMatchByKey.get(key)
                                return (
                                  <MomentCard
                                    key={key}
                                    m={m}
                                    displayRank={displayRank}
                                    onOpen={openModal}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <MomentCommentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        moment={selectedMoment}
        matchDetailPath={selectedMoment?.matchDetailPath}
      />
    </>
  )
}
