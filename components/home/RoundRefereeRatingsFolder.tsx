"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { EmblemImage } from "@/components/ui/EmblemImage"

export type RoundRefereeStat = {
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
  /** 홈팀 팬 평점 평균 (해당 경기 홈팀 팬만) */
  homeAvg?: number
  /** 원정팀 팬 평점 평균 (해당 경기 원정팀 팬만) */
  awayAvg?: number
}

type RoundHighlightForFolder = {
  leagueName: string
  roundNumber: number
  allRoundReferees: RoundRefereeStat[]
}

const REFEREE_ROLE_LABEL: Record<string, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  VAR: "VAR",
  WAITING: "대기심",
}

const ROLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "MAIN", label: "주심" },
  { value: "ASSISTANT", label: "부심" },
  { value: "VAR", label: "VAR" },
  { value: "WAITING", label: "대기심" },
]

type Props = {
  highlights: (RoundHighlightForFolder | null)[]
}

export function RoundRefereeRatingsFolder({ highlights }: Props) {
  const [open, setOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>("")
  const withReferees = highlights.filter(
    (h): h is RoundHighlightForFolder => h != null && h.allRoundReferees.length > 0
  )
  if (withReferees.length === 0) return null

  return (
    <section className="mb-6 border border-border rounded-md overflow-hidden bg-card/30">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left font-mono text-sm md:text-base font-bold text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="size-4 md:size-5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="size-4 md:size-5 shrink-0" aria-hidden />
        )}
        <span>라운드 심판 전체 평점 보기</span>
      </button>
      {open && (
        <div className="border-t border-border bg-card/10">
          {withReferees.map((h, blockIndex) => {
            const filteredReferees = roleFilter
              ? h.allRoundReferees.filter((ref) => ref.role === roleFilter)
              : h.allRoundReferees
            const isFirstBlock = blockIndex === 0
            return (
              <div
                key={`${h.leagueName}-${h.roundNumber}`}
                className="border-b border-border last:border-b-0 p-4 md:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest">
                    {h.leagueName} · Round {h.roundNumber}
                  </p>
                  {isFirstBlock && (
                    <div className="relative inline-block">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="font-mono text-xs md:text-sm bg-card border border-border text-foreground rounded-lg pl-4 pr-9 py-2 appearance-none cursor-pointer hover:border-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                        aria-label="역할 필터"
                      >
                        {ROLE_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.value || "all"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
                        aria-hidden
                      />
                    </div>
                  )}
                </div>
                {filteredReferees.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground py-4">
                    해당 역할의 심판이 없습니다.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                <table className="w-full min-w-0 md:min-w-[520px] font-mono text-xs md:text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-2 md:pr-3 font-bold uppercase tracking-wider whitespace-nowrap">
                        심판
                      </th>
                      <th className="py-2 pr-2 md:pr-3 font-bold uppercase tracking-wider">경기</th>
                      <th className="py-2 pr-2 md:pr-3 font-bold uppercase tracking-wider whitespace-nowrap">
                        역할
                      </th>
                      <th className="hidden md:table-cell py-2 pr-3 font-bold uppercase tracking-wider text-right">
                        홈팀 팬 평점
                      </th>
                      <th className="hidden md:table-cell py-2 pr-3 font-bold uppercase tracking-wider text-right">
                        원정팀 팬 평점
                      </th>
                      <th className="py-2 pr-2 md:pr-3 font-bold uppercase tracking-wider text-right whitespace-nowrap">
                        <span className="md:hidden">총점</span>
                        <span className="hidden md:inline">전체 평점</span>
                      </th>
                      <th className="hidden md:table-cell py-2 font-bold uppercase tracking-wider text-right">
                        투표
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferees.map((ref) => (
                      <tr
                        key={`${ref.id}-${ref.role}`}
                        className="border-b border-border/50 last:border-b-0"
                      >
                        <td className="py-2.5 pr-2 md:pr-3 align-middle">
                          <Link
                            href={`/referees/${ref.slug}`}
                            className="font-bold text-foreground hover:text-primary transition-colors whitespace-nowrap"
                          >
                            {ref.name}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-2 md:pr-3 align-middle">
                          {ref.matchForDisplay ? (
                            <Link
                              href={ref.matchForDisplay.matchPath}
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <span className="flex md:hidden items-center gap-1 shrink-0">
                                {ref.matchForDisplay.homeEmblemPath ? (
                                  <EmblemImage
                                    src={ref.matchForDisplay.homeEmblemPath}
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 shrink-0 object-contain"
                                  />
                                ) : (
                                  <span className="w-5 h-5 rounded bg-muted shrink-0" />
                                )}
                                <span className="text-[10px] font-bold">VS</span>
                                {ref.matchForDisplay.awayEmblemPath ? (
                                  <EmblemImage
                                    src={ref.matchForDisplay.awayEmblemPath}
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 shrink-0 object-contain"
                                  />
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
                        <td className="py-2.5 pr-2 md:pr-3 text-muted-foreground whitespace-nowrap">
                          {REFEREE_ROLE_LABEL[ref.role] ?? ref.role}
                        </td>
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
                )}
              {filteredReferees.length > 0 && filteredReferees.some((r) => r.matchForDisplay) && (
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  경기별 상세 평가는 각 경기 상세 페이지 → 심판 평가에서 확인할 수 있습니다.
                </p>
              )}
            </div>
          )
          })}
        </div>
      )}
    </section>
  )
}
