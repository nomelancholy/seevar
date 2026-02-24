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
  momentsPath: string
  isArchived: boolean
}

type Props = {
  createdByMe: MomentForMy[]
  participated: MomentForMy[]
}

type TabId = "created" | "participated" | "saved"

export function MyVarMomentsContent({
  createdByMe,
  participated,
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
          onClick={() => setTab("saved")}
          className={`pb-4 text-[10px] md:text-xs font-black italic font-mono whitespace-nowrap transition-colors border-b-2 ${
            tab === "saved"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          SAVED
        </button>
      </div>

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
                }).replace(/\. /g, "/").replace(".", "")}
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
                  ? `"${mom.description.slice(0, 80)}${mom.description.length > 80 ? "…" : ""}"`
                  : "—"}
              </p>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <div className="flex gap-4">
                <span className="text-muted-foreground">
                  SEE VAR <span className="text-foreground font-bold">{mom.seeVarCount.toLocaleString()}</span>
                </span>
                <span className="text-muted-foreground">
                  COMMENTS <span className="text-foreground font-bold">{mom.commentCount}</span>
                </span>
              </div>
              <Link
                href={mom.momentsPath}
                className="text-primary font-black italic flex items-center gap-1 hover:underline"
              >
                DETAILS
                <ChevronRight className="size-3" />
              </Link>
            </div>
          </div>
        ))}

        <Link
          href="/matches"
          className="border border-dashed border-border flex flex-col items-center justify-center p-8 opacity-60 hover:opacity-100 hover:border-primary transition-all min-h-[200px]"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="mb-4 text-muted-foreground"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-[10px] font-black font-mono uppercase">
            Create New Moment
          </span>
        </Link>
      </div>

      {tab === "saved" && (
        <div className="border border-border bg-card p-8 text-center text-muted-foreground font-mono text-[10px] md:text-xs col-span-full">
          저장한 모멘트가 없습니다.
        </div>
      )}
    </>
  )
}
