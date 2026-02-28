"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Check } from "lucide-react"

type Props = {
  availableYears: number[]
  currentYear: number | null
}

export function TeamMatchHistoryYearFilter({ availableYears, currentYear }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const sortedYears = [...availableYears].sort((a, b) => b - a)
  const activeYear = currentYear ?? sortedYears[0]
  const label = `${activeYear}년`

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function handleSelect(year: number) {
    const next = new URLSearchParams(searchParams.toString())
    next.set("year", String(year))
    router.push(`${pathname}?${next.toString()}`)
    setOpen(false)
  }

  if (availableYears.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
        연도
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="연도 선택"
          className="group flex items-center gap-2 font-mono text-[9px] md:text-[10px] uppercase tracking-widest bg-card border border-border hover:border-primary/60 px-3 py-1.5 md:py-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <span className="tabular-nums">{label}</span>
          <ChevronDown
            className={`size-3 md:size-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        <div
          ref={panelRef}
          role="listbox"
          aria-label="연도 선택"
          className={`absolute right-0 top-full z-50 mt-1 min-w-[100px] origin-top overflow-hidden border border-border bg-card shadow-lg transition-all duration-200 ${
            open
              ? "translate-y-0 opacity-100 scale-y-100"
              : "pointer-events-none -translate-y-1 opacity-0 scale-y-95"
          }`}
        >
          <div className="py-1">
            {sortedYears.map((y) => (
              <button
                key={y}
                type="button"
                role="option"
                aria-selected={activeYear === y}
                onClick={() => handleSelect(y)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[9px] md:text-[10px] uppercase tracking-widest tabular-nums transition-colors hover:bg-muted/80 hover:text-foreground ${
                  activeYear === y
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground"
                }`}
              >
                <span className="flex w-4 shrink-0 items-center justify-center">
                  {activeYear === y ? <Check className="size-3 text-primary" /> : null}
                </span>
                <span>{y}년</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
