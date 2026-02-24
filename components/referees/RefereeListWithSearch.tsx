"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

type Referee = {
  id: string
  slug: string
  name: string
  averageRating: number | null
  matchesCount: number
}

type Props = { referees: Referee[] }

export function RefereeListWithSearch({ referees }: Props) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return referees
    const q = query.trim().toLowerCase()
    return referees.filter((r) => r.name.toLowerCase().includes(q))
  }, [referees, query])

  return (
    <>
      <div className="mb-6 md:mb-8">
        <label className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase block mb-2">
          이름 검색
        </label>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="심판 이름 입력..."
          className="w-full max-w-md bg-card border border-border px-4 py-2.5 md:py-3 text-xs md:text-sm font-mono focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          aria-label="심판 이름 검색"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {filtered.map((r) => {
          const rating = r.averageRating ?? 0
          const isTop = rating >= 4
          const isLow = rating > 0 && rating < 2.5
          return (
            <Link
              key={r.id}
              href={`/referees/${r.slug}`}
              className="ledger-surface p-4 md:p-6 flex flex-col gap-4 md:gap-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary"
            >
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-1">
                    {r.name}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-tighter mb-1">
                    Global Rating
                  </div>
                  <div
                    className={`text-xl md:text-2xl font-black italic ${
                      isTop ? "text-primary" : isLow ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {r.averageRating != null ? r.averageRating.toFixed(1) : "—"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4 border-t border-border pt-3 md:pt-4">
                <div>
                  <p className="font-mono text-[7px] md:text-[8px] text-muted-foreground uppercase">
                    Total Matches
                  </p>
                  <p className="font-mono text-[10px] md:text-xs font-bold">{r.matchesCount}</p>
                </div>
                <div>
                  <p className="font-mono text-[7px] md:text-[8px] text-muted-foreground uppercase">
                    Total Votes
                  </p>
                  <p className="font-mono text-[10px] md:text-xs font-bold">
                    {r.matchesCount > 0 ? (r.matchesCount * 85).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-muted-foreground font-mono">
          {query.trim() ? "검색 결과가 없습니다." : "등록된 심판이 없습니다."}
        </p>
      )}
    </>
  )
}
