"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, User } from "lucide-react"
import { EmblemImage } from "@/components/ui/EmblemImage"
import { TextWithEmbedPreview } from "@/components/embed/TextWithEmbedPreview"

const ROLE_LABEL: Record<string, string> = {
  MAIN: "Main Referee",
  ASSISTANT: "Assistance",
  VAR: "VAR Official",
  WAITING: "WAITING",
}

type ReviewItem = {
  userName: string | null
  userImage: string | null
  fanTeamName: string | null
  fanTeamEmblem: string | null
  rating: number
  comment: string | null
}

type Props = {
  matchDate: string
  venue: string | null
  homeName: string
  awayName: string
  homeEmblem: string | null
  awayEmblem: string | null
  role: string
  matchRating: number | null
  matchPath: string
  reviews: ReviewItem[]
}

function StarMini({ filled }: { filled: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 md:w-[11px] md:h-[11px] ${
        filled ? "bg-primary" : "bg-muted"
      }`}
      style={{
        clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      }}
    />
  )
}

export function RefereeMatchRow({
  matchDate,
  venue,
  homeName,
  awayName,
  homeEmblem,
  awayEmblem,
  role,
  matchRating,
  matchPath,
  reviews,
}: Props) {
  const [open, setOpen] = useState(false)
  const stars = matchRating != null ? Math.round(matchRating) : 0
  return (
    <div className="border border-border hover:border-muted-foreground/50 transition-colors overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col md:flex-row md:items-center justify-between w-full p-4 gap-4 text-left"
      >
        <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-2">
          <div>
            <div className="font-mono text-[10px] md:text-xs text-muted-foreground">{matchDate}</div>
            {venue?.trim() && (
              <div className="font-mono text-[9px] md:text-[10px] text-muted-foreground mt-0.5">
                {venue.trim()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center gap-1.5 md:gap-2">
              <EmblemImage src={homeEmblem} width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
              <span className="font-bold text-sm md:text-lg uppercase">{homeName}</span>
            </div>
            <span className="text-muted-foreground italic text-xs md:text-base">VS</span>
            <div className="flex items-center gap-1.5 md:gap-2">
              <EmblemImage src={awayEmblem} width={24} height={24} className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
              <span className="font-bold text-sm md:text-lg uppercase">{awayName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-end md:gap-6 border-t border-border md:border-0 pt-3 md:pt-0">
          <div className="flex flex-col items-start md:items-end">
            <span className="font-mono text-[10px] md:text-xs text-primary font-bold uppercase">
              {ROLE_LABEL[role] ?? role}
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <StarMini key={i} filled={i <= stars} />
              ))}
              <span className="font-mono text-[10px] md:text-xs font-black italic ml-1">
                {matchRating != null ? matchRating.toFixed(1) : "—"}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`size-4 md:size-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[2000px]" : "max-h-0"
        }`}
      >
        <div className="border-t border-border bg-muted/20">
          <div className="flex justify-between items-center px-4 md:px-6 py-2.5 md:py-3 border-b border-border/50">
            <span className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest">
              Community Feedbacks
            </span>
            <Link
              href={matchPath}
              className="border border-border bg-card px-2.5 md:px-3 py-1.5 md:py-2 text-[9px] md:text-[10px] font-black italic font-mono text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1.5"
            >
              INSIDE GAME
              <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {reviews.length === 0 ? (
              <div className="p-4 font-mono text-[10px] md:text-xs text-muted-foreground">
                아직 평점이 없습니다.
              </div>
            ) : (
              reviews.map((r, i) => (
                <div
                  key={i}
                  className={`p-3 md:p-4 ${i === 0 ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden">
                          {r.userImage ? (
                            <img src={r.userImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="size-3.5 md:size-4 text-muted-foreground" />
                          )}
                        </div>
                        {r.fanTeamEmblem && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 bg-background rounded-full border border-border flex items-center justify-center p-0.5 shadow z-10 overflow-hidden">
                            <EmblemImage src={r.fanTeamEmblem} width={20} height={20} className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-black italic">
                          {r.userName ?? "Anonymous"}
                        </span>
                        <span className="text-[8px] md:text-[9px] text-muted-foreground font-mono uppercase">
                          {r.fanTeamName ? `${r.fanTeamName} SUPPORTING` : "FAN"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <StarMini key={j} filled={j <= Math.round(r.rating)} />
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <div className="text-[10px] md:text-xs text-muted-foreground">
                      <TextWithEmbedPreview text={r.comment} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
