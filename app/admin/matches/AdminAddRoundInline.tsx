"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRound } from "@/lib/actions/admin-matches"

type Props = {
  leagueId: string
  leagueName: string
  seasonYear: number
  baseUrl: string
  leagueSlug: string
}

export function AdminAddRoundInline({
  leagueId,
  leagueName,
  seasonYear,
  baseUrl,
  leagueSlug,
}: Props) {
  const router = useRouter()
  const [numberInput, setNumberInput] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const num = parseInt(numberInput, 10)
    if (Number.isNaN(num) || num < 1) {
      setError("라운드 번호를 1 이상으로 입력하세요.")
      return
    }
    setPending(true)
    const result = await createRound({ leagueId, number: num })
    setPending(false)
    if (result.ok) {
      router.push(
        `${baseUrl}?year=${seasonYear}&league=${leagueSlug}&round=${result.slug}`,
      )
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="mt-8 p-4 border border-border bg-muted/20">
      <p className="font-mono text-xs text-muted-foreground mb-3">
        이 리그에 라운드가 없습니다. 라운드를 추가한 뒤 JSON 일괄 등록을 할 수 있습니다.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <label className="font-mono text-[10px] text-muted-foreground">
          라운드 번호
        </label>
        <input
          type="number"
          min={1}
          value={numberInput}
          onChange={(e) => setNumberInput(e.target.value)}
          placeholder="37"
          className="w-20 bg-background border border-border px-2 py-1.5 text-xs focus:border-primary outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="border border-primary bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] uppercase disabled:opacity-50"
        >
          {pending ? "추가 중" : "라운드 추가"}
        </button>
      </form>
      {error && (
        <p className="mt-2 font-mono text-[10px] text-destructive">{error}</p>
      )}
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
        슬러그는 round-{numberInput || "N"}으로 생성됩니다.
      </p>
    </div>
  )
}
