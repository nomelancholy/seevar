'use client'

import Link from "next/link"
import { useState } from "react"
import { deriveMatchStatus } from "@/lib/utils/match-status"
import { EmblemImage } from "@/components/ui/EmblemImage"
import { TeamMatchHistoryYearFilter } from "./TeamMatchHistoryYearFilter"

const ROLE_LABEL: Record<string, string> = {
  MAIN: "MAIN",
  ASSISTANT: "ASST",
  VAR: "VAR",
  WAITING: "WAITING",
}

type RefereeStat = {
  id: string
  slug: string
  name: string
  fanAverageRating: number
  totalAssignments: number
  roleCounts: Record<string, number> | null
}

type CardByReferee = {
  id: string
  slug: string
  name: string
  totalYellowCards: number
  totalRedCards: number
}

type MatchRow = {
  id: string
  matchPath: string
  playedAt: Date | null
  status: string
  scoreHome: number | null
  scoreAway: number | null
  venue: string | null
  homeTeam: { id: string; name: string; emblemPath: string | null }
  awayTeam: { id: string; name: string; emblemPath: string | null }
  matchReferees: { role: string; referee: { id: string; slug: string; name: string } }[]
}

type Props = {
  teamName: string
  teamId: string
  /** 심판 상세에서 BACK 시 돌아갈 URL (팀 상세 등) */
  refereeBackPath: string
  compatibility: { high: RefereeStat | null; low: RefereeStat | null }
  compatibilityList: RefereeStat[]
  assignments: RefereeStat[]
  /** 이 팀에게 옐로/레드 카드를 부여한 심판별 집계 */
  cardsByReferee: CardByReferee[]
  matches: MatchRow[]
  availableYears: number[]
  currentYear: number | null
}

function getRoleCount(roleCounts: Record<string, number> | null, role: string): number {
  if (!roleCounts || typeof roleCounts !== "object") return 0
  return Number(roleCounts[role]) || 0
}

function refereeHref(slug: string, backPath: string): string {
  const back = backPath.startsWith("/") && !backPath.includes("//")
    ? `?back=${encodeURIComponent(backPath)}`
    : ""
  return `/referees/${slug}${back}`
}

export function TeamDetailSection({
  teamName,
  teamId,
  refereeBackPath,
  compatibility,
  compatibilityList,
  assignments,
  cardsByReferee,
  matches,
  availableYears,
  currentYear,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<"ratings" | "assignments" | "cards">("ratings")
  const formatDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).replace(/\. /g, "/").replace(".", "")
      : "—"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
      {/* LEFT: REFEREE COMPATIBILITY & FREQUENT ASSIGNMENTS */}
      <div className="lg:col-span-4 space-y-6 md:space-y-8">
        {/* Referee Compatibility (Fan Choice) */}
        <div className="ledger-surface p-4 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-6 md:mb-8 gap-2">
            <h3 className="font-mono text-[10px] md:text-xs font-black tracking-widest text-primary uppercase italic">
              Referee Compatibility (Fan Choice)
            </h3>
            <button
              type="button"
              onClick={() => {
                setModalTab("ratings")
                setModalOpen(true)
              }}
              className="font-mono text-[9px] md:text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              VIEW ALL
            </button>
          </div>
          <div className="space-y-6 md:space-y-8">
            <div>
              <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase mb-3 md:mb-4">
                High Compatibility
              </p>
              {compatibility.high ? (
                <div className="bg-card/50 border border-border p-3 md:p-4">
                  <Link
                    href={refereeHref(compatibility.high.slug, refereeBackPath)}
                    className="text-base md:text-lg font-black italic uppercase leading-none mb-2 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {compatibility.high.name}
                    <span className="text-[10px]">→</span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="w-16 md:w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-1 max-w-[80px]">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, (compatibility.high.fanAverageRating / 5) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] md:text-xs font-bold text-primary">
                      {compatibility.high.fanAverageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] text-muted-foreground py-2">—</p>
              )}
            </div>
            <div>
              <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase mb-3 md:mb-4">
                Low Compatibility
              </p>
              {compatibility.low ? (
                <div className="bg-card/50 border border-border p-3 md:p-4">
                  <Link
                    href={refereeHref(compatibility.low.slug, refereeBackPath)}
                    className="text-base md:text-lg font-black italic uppercase leading-none mb-2 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {compatibility.low.name}
                    <span className="text-[10px]">→</span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="w-16 md:w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-1 max-w-[80px]">
                      <div
                        className="h-full bg-destructive"
                        style={{ width: `${Math.min(100, (compatibility.low.fanAverageRating / 5) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] md:text-xs font-bold text-destructive">
                      {compatibility.low.fanAverageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] text-muted-foreground py-2">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Frequent Assignments */}
        <div className="ledger-surface p-4 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-6 md:mb-8 gap-2">
            <h3 className="font-mono text-[10px] md:text-xs font-black tracking-widest text-primary uppercase italic">
              Frequent Assignments
            </h3>
            <button
              type="button"
              onClick={() => {
                setModalTab("assignments")
                setModalOpen(true)
              }}
              className="font-mono text-[9px] md:text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              VIEW ALL
            </button>
          </div>
          <div className="space-y-2">
            {assignments.length === 0 ? (
              <p className="font-mono text-[10px] text-muted-foreground py-2">해당 팀 경기 배정 데이터가 없습니다.</p>
            ) : (
              assignments.slice(0, 5).map((ref, idx) => (
                <div
                  key={ref.id}
                  className={`flex items-center justify-between bg-card/30 p-2.5 md:p-3 border-l-2 ${
                    idx === 0 ? "border-primary" : "border-border"
                  }`}
                >
                  <Link
                    href={refereeHref(ref.slug, refereeBackPath)}
                    className="text-[10px] md:text-xs font-bold italic uppercase hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {idx + 1}. {ref.name}
                    <span className="text-[8px]">→</span>
                  </Link>
                  <span className="font-mono text-[9px] md:text-[10px] text-muted-foreground">
                    {ref.totalAssignments} Matches
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cards by Referee (총합 카드 상위 5명, VIEW ALL 시 전체) */}
        <div className="ledger-surface p-4 md:p-6 border border-border">
          <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
            <h3 className="font-mono text-[10px] md:text-xs font-black tracking-widest text-primary uppercase italic">
              Cards by Referee
            </h3>
            {cardsByReferee.length > 5 && (
              <button
                type="button"
                onClick={() => {
                  setModalTab("cards")
                  setModalOpen(true)
                }}
                className="font-mono text-[9px] md:text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                VIEW ALL
              </button>
            )}
          </div>
          <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground mb-3 md:mb-4">
            이 팀 경기에서 해당 심판이 부여한 옐로·레드 카드 수
          </p>
          {cardsByReferee.length === 0 ? (
            <p className="font-mono text-[10px] text-muted-foreground py-2">카드 부여 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {cardsByReferee.slice(0, 5).map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between bg-card/30 p-2.5 md:p-3 border border-border"
                >
                  <Link
                    href={refereeHref(ref.slug, refereeBackPath)}
                    className="text-[10px] md:text-xs font-bold italic uppercase hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {ref.name}
                    <span className="text-[8px]">→</span>
                  </Link>
                  <div className="flex items-center gap-3 md:gap-4 font-mono text-[10px] md:text-xs">
                    <span>🟨 {ref.totalYellowCards}</span>
                    <span>🟥 {ref.totalRedCards}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: MATCH HISTORY */}
      <div className="lg:col-span-8 ledger-surface p-4 md:p-6 border border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
          <h3 className="font-mono text-[10px] md:text-sm font-black tracking-widest text-muted-foreground uppercase">
            {teamName} Match History
          </h3>
          <TeamMatchHistoryYearFilter availableYears={availableYears} currentYear={currentYear} />
        </div>
        <div className="space-y-4">
          {matches.length === 0 ? (
            <p className="font-mono text-[10px] text-muted-foreground py-4">등록된 경기가 없습니다.</p>
          ) : (
            matches.map((m) => (
              <div
                key={m.id}
                className="flex flex-col p-4 md:p-6 border border-border hover:border-muted-foreground/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                    <div>
                      <div className="font-mono text-xs md:text-sm text-muted-foreground">{formatDate(m.playedAt)}</div>
                      {m.venue?.trim() && (
                        <div className="font-mono text-[9px] md:text-[10px] text-muted-foreground mt-0.5">
                          {m.venue.trim()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <EmblemImage src={m.homeTeam.emblemPath} width={32} height={32} className="w-6 h-6 md:w-8 md:h-8 shrink-0" />
                        <span className="font-black italic text-base md:text-xl uppercase">{m.homeTeam.name}</span>
                      </div>
                      <span className="text-2xl md:text-4xl font-black italic tracking-tighter">
                        {(() => {
                          const status = deriveMatchStatus(m.playedAt, { storedStatus: m.status })
                          return status === "LIVE" && m.scoreHome != null && m.scoreAway != null
                            ? `${m.scoreHome} : ${m.scoreAway}`
                            : status === "FINISHED" && m.scoreHome != null && m.scoreAway != null
                              ? `${m.scoreHome} : ${m.scoreAway}`
                              : "VS"
                        })()}
                      </span>
                      <div className="flex items-center gap-2 md:gap-3">
                        <EmblemImage src={m.awayTeam.emblemPath} width={32} height={32} className="w-6 h-6 md:w-8 md:h-8 shrink-0" />
                        <span className="font-black italic text-base md:text-xl uppercase text-muted-foreground">
                          {m.awayTeam.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={m.matchPath}
                    className="border border-border px-3 md:px-4 py-1.5 md:py-2 text-[8px] md:text-[10px] font-bold font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-all inline-flex items-center gap-2 w-fit"
                  >
                    INSIDE GAME →
                  </Link>
                </div>
                {m.matchReferees.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 pt-4 border-t border-border">
                    {m.matchReferees.map((mr) => (
                      <div key={mr.referee.id + mr.role} className="flex flex-col">
                        <span className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase mb-1">
                          {ROLE_LABEL[mr.role] ?? mr.role}
                        </span>
                        <Link
                          href={refereeHref(mr.referee.slug, refereeBackPath)}
                          className="font-mono text-[10px] md:text-xs font-bold hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {mr.referee.name}
                          <span className="text-[8px]">→</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div className="relative w-full max-w-3xl max-h-[80vh] bg-background border border-border shadow-2xl flex flex-col">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="닫기"
            >
              ✕
            </button>
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setModalTab("ratings")}
                className={`flex-1 py-3 text-[10px] md:text-xs font-mono tracking-widest uppercase ${
                  modalTab === "ratings"
                    ? "bg-card text-primary border-b-2 border-primary"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                Fan Ratings
              </button>
              <button
                type="button"
                onClick={() => setModalTab("assignments")}
                className={`flex-1 py-3 text-[10px] md:text-xs font-mono tracking-widest uppercase ${
                  modalTab === "assignments"
                    ? "bg-card text-primary border-b-2 border-primary"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                Assignment Stats
              </button>
              <button
                type="button"
                onClick={() => setModalTab("cards")}
                className={`flex-1 py-3 text-[10px] md:text-xs font-mono tracking-widest uppercase ${
                  modalTab === "cards"
                    ? "bg-card text-primary border-b-2 border-primary"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                Cards by Referee
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {modalTab === "cards" ? (
                cardsByReferee.length === 0 ? (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    카드 부여 기록이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cardsByReferee.map((ref, idx) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between border border-border bg-card/40 px-3 py-2 md:px-4 md:py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[9px] text-muted-foreground w-6 text-right">
                            {idx + 1}.
                          </span>
                          <Link
                            href={refereeHref(ref.slug, refereeBackPath)}
                            className="font-mono text-[10px] md:text-xs font-bold italic uppercase hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {ref.name}
                            <span className="text-[8px]">→</span>
                          </Link>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-[10px] md:text-xs">
                          <span>🟨 {ref.totalYellowCards}</span>
                          <span>🟥 {ref.totalRedCards}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : modalTab === "ratings" ? (
                compatibilityList.length === 0 ? (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    이 팀 팬 평점 데이터가 없습니다.
                  </p>
                ) : (
                  compatibilityList
                    .slice()
                    .sort((a, b) => b.fanAverageRating - a.fanAverageRating)
                    .map((ref, idx) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between border border-border bg-card/40 px-3 py-2 md:px-4 md:py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[9px] text-muted-foreground w-6 text-right">
                            {idx + 1}.
                          </span>
                          <Link
                            href={refereeHref(ref.slug, refereeBackPath)}
                            className="font-mono text-[10px] md:text-xs font-bold italic uppercase hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {ref.name}
                            <span className="text-[8px]">→</span>
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 md:w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (ref.fanAverageRating / 5) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-[10px] md:text-xs font-bold text-primary">
                            {ref.fanAverageRating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))
                )
              ) : modalTab === "assignments" && assignments.length === 0 ? (
                <p className="font-mono text-[10px] text-muted-foreground">
                  배정 데이터가 없습니다.
                </p>
              ) : modalTab === "assignments" ? (
                <div className="w-full border border-border bg-card/40">
                  <div className="grid grid-cols-8 gap-2 px-4 py-3 md:px-6 md:py-3 border-b border-border text-[9px] md:text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    <span className="text-right w-6">#</span>
                    <span>Referee Name</span>
                    <span className="text-center">Main</span>
                    <span className="text-center">Asst</span>
                    <span className="text-center">Var</span>
                    <span className="text-center">Avar</span>
                    <span className="text-center">WAITING</span>
                    <span className="text-center">Total</span>
                  </div>
                  <div className="divide-y divide-border">
                    {assignments
                      .slice()
                      .sort((a, b) => b.totalAssignments - a.totalAssignments)
                      .map((ref, idx) => (
                        <div
                          key={ref.id}
                          className="grid grid-cols-8 gap-2 px-4 py-2.5 md:px-6 md:py-3 items-center text-[10px] md:text-xs font-mono"
                        >
                          <span className="text-right text-muted-foreground w-6">
                            {idx + 1}.
                          </span>
                          <Link
                            href={refereeHref(ref.slug, refereeBackPath)}
                            className="font-bold italic uppercase hover:text-primary transition-colors flex items-center gap-1 truncate"
                          >
                            {ref.name}
                            <span className="text-[8px]">→</span>
                          </Link>
                          <span className="text-center">
                            {getRoleCount(ref.roleCounts, "MAIN")}
                          </span>
                          <span className="text-center">
                            {getRoleCount(ref.roleCounts, "ASSISTANT")}
                          </span>
                          <span className="text-center">
                            {getRoleCount(ref.roleCounts, "VAR")}
                          </span>
                          <span className="text-center">
                            0
                          </span>
                          <span className="text-center">
                            {getRoleCount(ref.roleCounts, "WAITING")}
                          </span>
                          <span className="text-center font-bold text-primary">
                            {ref.totalAssignments}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
