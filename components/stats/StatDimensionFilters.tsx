"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

const ROLE_OPTIONS = [
  { value: "MAIN", label: "주심" },
  { value: "ASSISTANT", label: "부심" },
  { value: "WAITING", label: "대기심" },
  { value: "VAR", label: "VAR" },
] as const

type Props = {
  availableYears: number[]
  currentYear: number | null
  availableLeagues: Array<{ slug: string; name: string }>
  currentLeague: string | null
  currentRole: string | null
  yearParamKey?: string
  leagueParamKey?: string
  roleParamKey?: string
}

export function StatDimensionFilters({
  availableYears,
  currentYear,
  availableLeagues,
  currentLeague,
  currentRole,
  yearParamKey = "stats",
  leagueParamKey = "statsLeague",
  roleParamKey = "statsRole",
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString())
    if (value === "all") next.set(key, "all")
    else next.set(key, value)
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="통계 필터">
      <FilterSelect
        label="연도"
        value={currentYear == null ? "all" : String(currentYear)}
        onChange={(value) => updateFilter(yearParamKey, value)}
        options={availableYears.map((year) => ({ value: String(year), label: `${year}년` }))}
      />
      <FilterSelect
        label="리그"
        value={currentLeague ?? "all"}
        onChange={(value) => updateFilter(leagueParamKey, value)}
        options={availableLeagues.map((league) => ({ value: league.slug, label: league.name }))}
      />
      <FilterSelect
        label="역할"
        value={currentRole ?? "all"}
        onChange={(value) => updateFilter(roleParamKey, value)}
        options={[...ROLE_OPTIONS]}
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex items-center gap-1.5 font-mono text-[10px] md:text-xs text-muted-foreground">
      <span className="uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-card border border-border px-2 py-1.5 text-foreground outline-none focus:border-primary"
      >
        <option value="all">전체</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
