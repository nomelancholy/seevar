"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

type Props = {
  availableYears: number[]
  currentYear: number | null
}

export function TeamMatchHistoryYearFilter({ availableYears, currentYear }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString())
    if (value) {
      next.set("year", value)
    }
    const q = next.toString()
    router.push(q ? `${pathname}?${q}` : pathname)
  }

  if (availableYears.length === 0) return null

  const sortedYears = [...availableYears].sort((a, b) => b - a)
  const activeYear = currentYear ?? sortedYears[0]

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
        연도
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {sortedYears.map((y) => {
          const isActive = activeYear === y
          return (
            <button
              key={y}
              type="button"
              onClick={() => handleChange(String(y))}
              className={`px-2.5 py-1 rounded-full border text-[9px] md:text-[10px] font-mono transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary hover:text-foreground"
              }`}
            >
              {y}
            </button>
          )
        })}
      </div>
    </div>
  )
}
