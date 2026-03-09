"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { EmblemImage } from "@/components/ui/EmblemImage"
import { TextWithEmbedPreview } from "@/components/embed/TextWithEmbedPreview"
import { UserProfileLink } from "@/components/user/UserProfileLink"

/** 아카이브 페이지에서 전달하는 심판 통계 (RoundRefereeRatingsFolder와 동일한 구조) */
type RoundRefereeStat = {
  id: string
  slug: string
  name: string
  role: string
  avg: number
  voteCount: number
  matchForDisplay?: {
    homeName: string
    awayName: string
    matchPath: string
    homeEmblemPath?: string | null
    awayEmblemPath?: string | null
  }
  homeAvg?: number
  awayAvg?: number
}

const ROLE_ORDER = ["MAIN", "VAR", "ASSISTANT", "WAITING"] as const
const DEFAULT_OPEN_BEST_WORST = new Set(["MAIN", "VAR"])
const ROLE_LABEL: Record<string, string> = {
  MAIN: "주심",
  VAR: "VAR",
  ASSISTANT: "부심",
  WAITING: "대기심",
}

export type RefereeCardData = {
  refereeId: string
  slug: string
  name: string
  role: string
  avg: number
  voteCount: number
  matchForDisplay?: {
    homeName: string
    awayName: string
    matchPath: string
    homeEmblemPath?: string | null
    awayEmblemPath?: string | null
  }
  reviews: {
    id: string
    userName: string
    userHandle?: string | null
    userImage?: string | null
    teamName: string | null
    teamSlug: string | null
    teamEmblem: string | null
    likeCount: number
    comment: string
    matchLabel: string
    rating: number
  }[]
}

type Props = {
  bestByRole: Partial<Record<string, RefereeCardData>>
  worstByRole: Partial<Record<string, RefereeCardData>>
  allRoundReferees: RoundRefereeStat[]
  leagueName: string
  roundNumber: number
}

export function RoundRefereeBestWorstSection({
  bestByRole = {},
  worstByRole = {},
  allRoundReferees = [],
  leagueName,
  roundNumber,
}: Props) {
  const [bestWorstOpen, setBestWorstOpen] = useState<Set<string>>(() => new Set(
    ROLE_ORDER.filter((r) => DEFAULT_OPEN_BEST_WORST.has(r))
  ))
  const [fullRatingOpen, setFullRatingOpen] = useState<string | null>(null)

  const toggleBestWorst = (role: string) => {
    setBestWorstOpen((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  const toggleFullRating = (role: string) => {
    setFullRatingOpen((prev) => (prev === role ? null : role))
  }

  const renderCard = (
    data: RefereeCardData,
    kind: "best" | "worst"
  ) => {
    const isBest = kind === "best"
    const badgeBg = isBest ? "bg-[#00ff41] text-black" : "bg-red-600 text-white"
    const hoverAccent = isBest ? "hover:text-[#00ff41]" : "hover:text-red-500"
    return (
      <div className="ledger-surface p-4 md:p-6 border border-border min-w-0">
        <div className="flex justify-between items-start mb-6">
          <div className="min-w-0 flex-1">
            <Link
              href={`/referees/${data.slug || data.refereeId}`}
              className={`text-xl md:text-2xl font-black uppercase leading-none ${hoverAccent} transition-colors not-italic`}
            >
              {data.name}
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <span className="bg-zinc-800 text-white px-2 py-0.5 text-[10px] md:text-xs font-bold font-mono">
                {ROLE_LABEL[data.role] ?? data.role}
              </span>
            </div>
            {data.matchForDisplay && (
              <Link
                href={data.matchForDisplay.matchPath}
                className={`mt-2 block font-mono text-[10px] md:text-xs text-muted-foreground ${hoverAccent} transition-colors not-italic whitespace-nowrap`}
              >
                {data.matchForDisplay.homeName} vs {data.matchForDisplay.awayName} →
              </Link>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className={`${badgeBg} px-2.5 py-1 text-[10px] md:text-xs font-black uppercase`}>
              {isBest ? "최고점" : "최저점"}
            </span>
            <p className="font-mono text-sm md:text-base font-bold text-zinc-400 mt-1 whitespace-nowrap not-italic">
              AVG: {data.avg.toFixed(1)} / 5.0 ({data.voteCount}명)
            </p>
          </div>
        </div>
        {data.reviews.length > 0 && (
          <div className="space-y-4">
            <p className="font-mono text-[10px] md:text-xs text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
              베스트 팬 한줄평
            </p>
            {data.reviews.map((fb) => (
              <div key={fb.id} className="bg-zinc-900/50 p-3 border border-zinc-800">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="relative">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 flex items-center justify-center">
                        {fb.userImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fb.userImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-zinc-400 font-mono">
                            {fb.userName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {fb.teamEmblem && (
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full border border-zinc-900 flex items-center justify-center p-0.5 shadow-lg z-10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={fb.teamEmblem} alt={fb.teamName ?? ""} className="relative z-10 w-full h-full" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <UserProfileLink
                        handle={fb.userHandle ?? null}
                        className="text-xs md:text-sm font-black text-white not-italic cursor-pointer hover:underline"
                      >
                        {fb.userName}
                      </UserProfileLink>
                      {fb.teamName && (
                        <span className="text-[10px] md:text-xs font-mono text-zinc-500 uppercase">
                          {fb.teamName} SUPPORTING
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-[10px] md:text-xs text-zinc-400">
                      {fb.rating.toFixed(1)} / 5.0
                    </span>
                    <div className="flex items-center gap-1 text-blue-400">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span className="font-mono text-xs md:text-sm font-black">{fb.likeCount}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs md:text-sm text-zinc-300 not-italic">
                  <TextWithEmbedPreview text={fb.comment} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderBestWorstRow = (role: string) => {
    const best = bestByRole[role]
    const worst = worstByRole[role]
    const label = ROLE_LABEL[role] ?? role
    const refCountForRole = allRoundReferees.filter((r) => r.role === role).length
    const isOpen = bestWorstOpen.has(role)
    if (!best && !worst && refCountForRole === 0) return null
    return (
      <div key={role} className="border-b border-border last:border-b-0">
        <button
          type="button"
          onClick={() => toggleBestWorst(role)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left font-mono text-sm md:text-base font-bold text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="size-4 md:size-5 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="size-4 md:size-5 shrink-0" aria-hidden />
          )}
          <span>라운드 베스트 / 워스트 {label}</span>
        </button>
        {isOpen && (
          <div className="border-t border-border bg-card/10">
            {(best || worst) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-5">
                {best ? renderCard(best, "best") : <div className="ledger-surface p-4 border border-border text-muted-foreground font-mono text-sm">해당 역할 베스트 없음</div>}
                {worst ? renderCard(worst, "worst") : <div className="ledger-surface p-4 border border-border text-muted-foreground font-mono text-sm">해당 역할 워스트 없음</div>}
              </div>
            )}
            {refCountForRole > 0 && (
              <div className="border-t border-border/50">
                <button
                  type="button"
                  onClick={() => toggleFullRating(role)}
                  className="w-full flex items-center gap-2 pl-6 pr-4 py-2.5 text-left font-mono text-xs md:text-sm font-bold text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                >
                  {fullRatingOpen === role ? (
                    <ChevronDown className="size-3 md:size-4 shrink-0" aria-hidden />
                  ) : (
                    <ChevronRight className="size-3 md:size-4 shrink-0" aria-hidden />
                  )}
                  <span>라운드 {label} 전체 평점 보기</span>
                  <span className="text-muted-foreground/80 font-normal text-[10px]">({refCountForRole}명)</span>
                </button>
                {fullRatingOpen === role && (
                  <div className="border-t border-border/50 bg-card/5">
                    {renderFullRatingTable(role)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderFullRatingTable = (role: string) => {
    const filtered = allRoundReferees.filter((r) => r.role === role)
    const label = ROLE_LABEL[role] ?? role
    if (filtered.length === 0) {
      return (
        <p className="font-mono text-xs text-muted-foreground py-4">
          해당 역할의 심판이 없습니다.
        </p>
      )
    }
    return (
      <div className="overflow-x-auto p-4 md:p-5">
        <table className="w-full min-w-0 md:min-w-[520px] font-mono text-xs md:text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 pr-2 md:pr-3 font-bold uppercase tracking-wider whitespace-nowrap">심판</th>
              <th className="py-2 pr-2 md:pr-3 font-bold uppercase tracking-wider">경기</th>
              <th className="py-2 pr-2 md:pr-3 font-bold uppercase tracking-wider whitespace-nowrap">역할</th>
              <th className="hidden md:table-cell py-2 pr-3 font-bold uppercase tracking-wider text-right">홈팀 팬 평점</th>
              <th className="hidden md:table-cell py-2 pr-3 font-bold uppercase tracking-wider text-right">원정팀 팬 평점</th>
              <th className="py-2 pr-2 md:pr-3 font-bold uppercase tracking-wider text-right whitespace-nowrap">
                <span className="md:hidden">총점</span>
                <span className="hidden md:inline">전체 평점</span>
              </th>
              <th className="hidden md:table-cell py-2 font-bold uppercase tracking-wider text-right">투표</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ref) => (
              <tr key={`${ref.id}-${ref.role}`} className="border-b border-border/50 last:border-b-0">
                <td className="py-2.5 pr-2 md:pr-3 align-middle">
                  <Link href={`/referees/${ref.slug}`} className="font-bold text-foreground hover:text-primary transition-colors whitespace-nowrap">
                    {ref.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-2 md:pr-3 align-middle">
                  {ref.matchForDisplay ? (
                    <Link href={ref.matchForDisplay.matchPath} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                      <span className="flex md:hidden items-center gap-1 shrink-0">
                        {ref.matchForDisplay.homeEmblemPath ? (
                          <EmblemImage src={ref.matchForDisplay.homeEmblemPath} width={20} height={20} className="w-5 h-5 shrink-0 object-contain" />
                        ) : (
                          <span className="w-5 h-5 rounded bg-muted shrink-0" />
                        )}
                        <span className="text-[10px] font-bold">VS</span>
                        {ref.matchForDisplay.awayEmblemPath ? (
                          <EmblemImage src={ref.matchForDisplay.awayEmblemPath} width={20} height={20} className="w-5 h-5 shrink-0 object-contain" />
                        ) : (
                          <span className="w-5 h-5 rounded bg-muted shrink-0" />
                        )}
                      </span>
                      <span className="hidden md:inline">
                        {ref.matchForDisplay.homeName} vs {ref.matchForDisplay.awayName}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-2 md:pr-3 text-muted-foreground whitespace-nowrap">{ROLE_LABEL[ref.role] ?? ref.role}</td>
                <td className="hidden md:table-cell py-2.5 pr-3 text-right tabular-nums text-muted-foreground align-middle">
                  {ref.homeAvg != null ? `${ref.homeAvg.toFixed(1)} / 5.0` : "—"}
                </td>
                <td className="hidden md:table-cell py-2.5 pr-3 text-right tabular-nums text-muted-foreground align-middle">
                  {ref.awayAvg != null ? `${ref.awayAvg.toFixed(1)} / 5.0` : "—"}
                </td>
                <td className="py-2.5 pr-2 md:pr-3 text-right font-bold tabular-nums align-middle whitespace-nowrap">
                  {ref.avg.toFixed(1)} / 5.0
                </td>
                <td className="hidden md:table-cell py-2.5 text-right text-muted-foreground tabular-nums align-middle">
                  {ref.voteCount}명
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const hasAnyData = ROLE_ORDER.some(
    (r) => bestByRole[r] || worstByRole[r] || allRoundReferees.some((ref) => ref.role === r)
  )
  if (!hasAnyData) return null

  return (
    <section className="mb-8 md:mb-12 border border-border rounded-md overflow-hidden bg-card/30">
      <div className="border-b border-border last:border-b-0">
        {ROLE_ORDER.map(renderBestWorstRow)}
      </div>
    </section>
  )
}
