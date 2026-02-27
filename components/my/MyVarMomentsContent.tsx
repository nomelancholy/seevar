"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

export type MomentForMy = {
  id: string
  description: string | null
  seeVarCount: number
  commentCount: number
  createdAt: string
  matchTitle: string
  leagueRound: string
  matchDetailPath: string
  isArchived: boolean
}

type Props = {
  createdByMe: MomentForMy[]
  participated: MomentForMy[]
}

export type RatingForMy = {
  id: string
  createdAt: string
  matchTitle: string
  leagueRound: string
  refereeName: string
  role: string
  rating: number
  matchDetailPath: string
}

type Props = {
  createdByMe: MomentForMy[]
  participated: MomentForMy[]
  ratings: RatingForMy[]
}

type TabId = "created" | "participated" | "ratings"

export function MyVarMomentsContent({
  createdByMe,
  participated,
  ratings,
}: Props) {
  const [tab, setTab] = useState<TabId>("created")

  const list =
    tab === "created"
      ? createdByMe
      : tab === "participated"
        ? participated
        : []

  return (
    <>
      <div className="flex gap-6 md:gap-8 border-b border-border mb-6 md:mb-8 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setTab("created")}
          className={`pb-4 text-[10px] md:text-xs font-black italic font-mono whitespace-nowrap transition-colors border-b-2 ${
            tab === "created"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          CREATED BY ME
        </button>
        <button
          type="button"
          onClick={() => setTab("participated")}
          className={`pb-4 text-[10px] md:text-xs font-black italic font-mono whitespace-nowrap transition-colors border-b-2 ${
            tab === "participated"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          PARTICIPATED
        </button>
        <button
          type="button"
          onClick={() => setTab("ratings")}
          className={`pb-4 text-[10px] md:text-xs font-black italic font-mono whitespace-nowrap transition-colors border-b-2 ${
            tab === "ratings"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          REFEREE RATINGS
        </button>
      </div>

      {tab === "ratings" ? (
        <div className="space-y-3">
          {ratings.length === 0 ? (
            <div className="border border-border bg-card p-8 text-center text-muted-foreground font-mono text-[10px] md:text-xs">
              아직 남긴 심판 평점이 없습니다.
            </div>
          ) : (
            ratings.map((r) => (
              <div
                key={r.id}
                className="border border-border bg-card/70 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 text-[8px] font-mono">
                      {new Date(r.createdAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                        .replace(/\. /g, "/")
                        .replace(".", "")}
                    </span>
                    <span className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase">
                      {r.leagueRound}
                    </span>
                  </div>
                  <h3 className="text-sm md:text-base font-black italic uppercase">
                    {r.matchTitle}
                  </h3>
                  <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground mt-1">
                    Referee: <span className="font-bold">{r.refereeName}</span>{" "}
                    <span className="uppercase text-xs">({r.role})</span>
                  </p>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4">
                  <span className="font-mono text-[10px] md:text-xs text-primary font-bold">
                    RATING {r.rating.toFixed(1)}
                  </span>
                  <Link
                    href={r.matchDetailPath}
                    className="text-primary font-black italic flex items-center gap-1 hover:underline text-[10px] md:text-xs"
                  >
                    DETAILS
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {list.map((mom) => (
            <div
              key={mom.id}
              className="border border-border bg-card p-4 md:p-6 transition-all hover:border-primary hover:-translate-y-0.5"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="bg-muted text-muted-foreground px-2 py-0.5 text-[8px] font-mono">
                  {new Date(mom.createdAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })
                    .replace(/\. /g, "/")
                    .replace(".", "")}
                </span>
                <span
                  className={`text-[8px] font-mono font-bold ${
                    mom.isArchived ? "text-muted-foreground" : "text-primary"
                  }`}
                >
                  {mom.isArchived ? "ARCHIVED" : "ACTIVE"}
                </span>
              </div>
              <h3 className="text-base md:text-lg font-black italic uppercase mb-1">
                {mom.matchTitle}
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground mb-4">
                {mom.leagueRound}
              </p>
              <div className="bg-muted/50 p-3 border border-border mb-4">
                <p className="text-xs text-muted-foreground italic line-clamp-2">
                  {mom.description
                    ? `"${mom.description.slice(0, 80)}${
                        mom.description.length > 80 ? "…" : ""
                      }"`
                    : "—"}
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">
                    SEE VAR{" "}
                    <span className="text-foreground font-bold">
                      {mom.seeVarCount.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    COMMENTS{" "}
                    <span className="text-foreground font-bold">
                      {mom.commentCount}
                    </span>
                  </span>
                </div>
                <Link
                  href={mom.matchDetailPath}
                  className="text-primary font-black italic flex items-center gap-1 hover:underline"
                >
                  DETAILS
                  <ChevronRight className="size-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
