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
    if (value === "all" || value === "") {
      next.delete("year")
    } else {
      next.set("year", value)
    }
    const q = next.toString()
    router.push(q ? `${pathname}?${q}` : pathname)
  }

  if (availableYears.length === 0) return null

  return (
    <select
      value={currentYear ?? "all"}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-card border border-border px-3 py-1.5 text-[10px] md:text-xs font-mono text-muted-foreground focus:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      aria-label="연도 필터"
    >
      <option value="all">전체 연도</option>
      {[...availableYears].sort((a, b) => b - a).map((y) => (
        <option key={y} value={y}>
          {y}년
        </option>
      ))}
    </select>
  )
}
