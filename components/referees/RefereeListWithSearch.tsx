"use client"

import Link from "next/link"
import { useMemo, useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

type Referee = {
  id: string
  slug: string
  name: string
  averageRating: number | null
  totalVotes: number
  matchesCount: number
  totalYellowCards: number
  totalRedCards: number
}

type Props = { referees: Referee[] }

type SortOption = "RATING_DESC" | "RATING_ASC" | "NAME_ASC"

export function RefereeListWithSearch({ referees }: Props) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortOption>("NAME_ASC")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = q ? referees.filter((r) => r.name.toLowerCase().includes(q)) : referees

    result = [...result].sort((a, b) => {
      if (sort === "RATING_DESC") {
        const ratingA = a.averageRating ?? -1
        const ratingB = b.averageRating ?? -1
        if (ratingA !== ratingB) return ratingB - ratingA
        return a.name.localeCompare(b.name)
      }
      if (sort === "RATING_ASC") {
        const ratingA = a.averageRating ?? 999
        const ratingB = b.averageRating ?? 999
        if (ratingA !== ratingB) return ratingA - ratingB
        return a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })

    return result
  }, [referees, query, sort])

  const sortOptions: Record<SortOption, string> = {
    NAME_ASC: "이름 순",
    RATING_DESC: "평점 높은 순",
    RATING_ASC: "평점 낮은 순",
  }

  return (
    <>
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="w-full max-w-md">
          <label className="font-mono text-xs md:text-sm text-muted-foreground uppercase block mb-2">
            이름 검색
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="심판 이름 입력..."
            className="w-full bg-card border border-border px-4 py-2.5 md:py-3 text-xs md:text-sm font-mono focus:outline-none focus:border-primary placeholder:text-muted-foreground"
            aria-label="심판 이름 검색"
          />
        </div>
        <div className="w-full md:w-48 relative" ref={dropdownRef}>
          <label className="font-mono text-xs md:text-sm text-muted-foreground uppercase block mb-2 md:hidden">
            정렬 기준
          </label>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-card border border-border px-4 py-2.5 md:py-3 text-xs md:text-sm font-mono flex items-center justify-between focus:outline-none focus:border-primary hover:bg-muted/50 transition-colors"
          >
            <span>{sortOptions[sort]}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-card border border-border shadow-lg">
              {(Object.entries(sortOptions) as [SortOption, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 text-xs md:text-sm font-mono hover:bg-muted/50 transition-colors ${
                    sort === key ? "text-primary bg-muted/20" : "text-foreground"
                  }`}
                  onClick={() => {
                    setSort(key)
                    setIsDropdownOpen(false)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
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
                  <div className="font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-tighter mb-1">
                    총 평점
                  </div>
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span
                      className={`text-xl md:text-2xl font-black italic ${
                        isTop ? "text-primary" : isLow ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {r.averageRating != null ? r.averageRating.toFixed(1) : "—"}
                    </span>
                    {r.totalVotes > 0 && (
                      <span className="font-mono text-xs md:text-sm text-muted-foreground">
                        ({r.totalVotes})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 md:gap-4 border-t border-border pt-3 md:pt-4">
                <div>
                  <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-0.5">
                    총 배정 경기
                  </p>
                  <p className="font-mono text-xs md:text-sm font-bold">{r.matchesCount}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-0.5">
                    총 부여 경고
                  </p>
                  <p className="font-mono text-xs md:text-sm font-bold">{r.totalYellowCards}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] md:text-xs text-muted-foreground uppercase mb-0.5">
                    총 부여 퇴장
                  </p>
                  <p className="font-mono text-xs md:text-sm font-bold">{r.totalRedCards}</p>
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
