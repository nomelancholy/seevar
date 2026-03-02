"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { EmblemImage } from "@/components/ui/EmblemImage"
import { RefereeAssignmentYearFilter } from "./RefereeAssignmentYearFilter"

const ROLES = ["MAIN", "ASSISTANT", "VAR", "WAITING"] as const
const ROLE_HEADER: Record<string, string> = {
  MAIN: "MAIN",
  ASSISTANT: "ASST",
  VAR: "VAR",
  WAITING: "WAITING",
}

export type TeamStatForExpand = {
  teamName: string
  emblemPath: string | null
  roleCounts: Record<string, number> | null
  totalYellowCards: number
  totalRedCards: number
  totalAssignments: number
}

type Props = {
  title: string
  availableYears: number[]
  currentYear: number | null
  paramKey: "year" | "stats"
  showAllOption?: boolean
  teamStats: TeamStatForExpand[]
  variant: "assignment" | "cards" | "match"
  children: React.ReactNode
}

function getRoleCount(roleCounts: Record<string, number> | null, role: string): number {
  if (!roleCounts || typeof roleCounts !== "object") return 0
  const n = roleCounts[role]
  return typeof n === "number" && Number.isInteger(n) ? n : 0
}

export function RefereeSectionWithTeamExpand({
  title,
  availableYears,
  currentYear,
  paramKey,
  showAllOption = false,
  teamStats,
  variant,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const hasTeamStats = teamStats.length > 0

  return (
    <>
      {/* Title row: title left, arrow right (same as Global Rating) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full gap-2 mb-2 group cursor-pointer text-left"
      >
        <h3 className="font-mono text-xs md:text-sm font-bold tracking-widest text-muted-foreground uppercase">
          {title}
        </h3>
        <div
          className={`p-1.5 md:p-2 rounded-full border border-border bg-muted/50 group-hover:bg-muted transition-transform duration-300 shrink-0 ${open ? "rotate-180" : ""}`}
        >
          <ChevronDown className="size-4 md:size-5 text-muted-foreground" />
        </div>
      </button>
      {/* Filter on next line, left-aligned under title */}
      {availableYears.length > 0 && (
        <div className="mb-6 md:mb-8 flex justify-start">
          <RefereeAssignmentYearFilter
            availableYears={availableYears}
            currentYear={currentYear}
            paramKey={paramKey}
            showAllOption={showAllOption}
          />
        </div>
      )}
      {!availableYears.length && <div className="mb-6 md:mb-8" />}

      {children}

      {hasTeamStats && (
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            open ? "max-h-[1200px] opacity-100 mt-6 pt-6 border-t border-border" : "max-h-0 opacity-0 mt-0 pt-0"
          }`}
        >
          <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
            By team
          </p>
          {(variant === "assignment" || variant === "match") && (
            <>
              <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                Total Assignments
              </p>
              <div className="border border-border overflow-x-auto">
                <table className="w-full font-mono text-[10px] md:text-xs">
                  <thead>
                    <tr className="border-b border-border bg-card/50 text-muted-foreground uppercase tracking-widest">
                      <th className="text-left p-2 font-bold">Team</th>
                      {ROLES.map((r) => (
                        <th key={r} className="text-center p-2 font-bold w-12 md:w-14">
                          {ROLE_HEADER[r]}
                        </th>
                      ))}
                      <th className="text-center p-2 font-bold w-12 md:w-14">Total</th>
                      {(variant === "match") && (
                        <th className="text-center p-2 font-bold">Cards</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teamStats.map((ts) => {
                      const main = getRoleCount(ts.roleCounts, "MAIN")
                      const asst = getRoleCount(ts.roleCounts, "ASSISTANT")
                      const var_ = getRoleCount(ts.roleCounts, "VAR")
                      const wait = getRoleCount(ts.roleCounts, "WAITING")
                      const total = ts.totalAssignments
                      return (
                        <tr key={ts.teamName} className="bg-card/30">
                          <td className="p-2 flex items-center gap-2">
                            <EmblemImage
                              src={ts.emblemPath}
                              width={20}
                              height={20}
                              className="w-5 h-5 shrink-0 object-contain"
                            />
                            <span className="font-bold uppercase truncate max-w-[120px] md:max-w-none">
                              {ts.teamName}
                            </span>
                          </td>
                          <td className="text-center p-2">{main}</td>
                          <td className="text-center p-2">{asst}</td>
                          <td className="text-center p-2">{var_}</td>
                          <td className="text-center p-2">{wait}</td>
                          <td className="text-center p-2 font-bold">{total}</td>
                          {variant === "match" && (
                            <td className="text-center p-2 text-muted-foreground">
                              🟨 {ts.totalYellowCards} 🟥 {ts.totalRedCards}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {variant === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3">
              {teamStats
                .filter((ts) => ts.totalYellowCards > 0 || ts.totalRedCards > 0)
                .map((ts) => (
                  <div
                    key={ts.teamName}
                    className="bg-card/50 p-3 md:p-4 border border-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <EmblemImage
                        src={ts.emblemPath}
                        width={24}
                        height={24}
                        className="w-5 h-5 md:w-6 md:h-6 object-contain shrink-0"
                      />
                      <span className="font-mono text-[10px] md:text-xs font-bold uppercase">
                        {ts.teamName}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] md:text-xs text-muted-foreground">
                      🟨 {ts.totalYellowCards} 🟥 {ts.totalRedCards}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
