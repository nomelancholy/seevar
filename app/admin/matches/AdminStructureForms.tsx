"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSeason } from "@/lib/actions/admin-matches"

export function AdminStructureForms() {
  const router = useRouter()
  const [yearInput, setYearInput] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAddSeason(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const y = parseInt(yearInput, 10)
    if (Number.isNaN(y)) {
      setError("연도를 입력해 주세요.")
      return
    }
    setPending(true)
    const result = await createSeason(y)
    setPending(false)
    if (result.ok) {
      setYearInput("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="mt-6 p-4 border border-border bg-muted/20">
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">
        시즌(연도) 추가
      </h4>
      <p className="text-muted-foreground text-[10px] mb-3">
        연도만 입력 후 추가하면 위 목록에 시즌이 생깁니다. 리그·라운드는 각 시즌·리그 블록 안에서 추가하세요.
      </p>
      <form onSubmit={handleAddSeason} className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1990}
          max={2100}
          value={yearInput}
          onChange={(e) => setYearInput(e.target.value)}
          placeholder="2027"
          className="w-24 bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="border border-primary bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] uppercase disabled:opacity-50"
        >
          {pending ? "추가 중" : "추가"}
        </button>
      </form>
      {error && <p className="mt-2 text-destructive text-[10px] font-mono">{error}</p>}
    </div>
  )
}
