"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Star } from "lucide-react"
import { setRoundFocus } from "@/lib/actions/admin-matches"

type Props = {
  roundId: string
  isFocus: boolean
}

export function RoundFocusToggle({ roundId, isFocus }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleToggle() {
    setPending(true)
    try {
      const result = await setRoundFocus(roundId, !isFocus)
      if (result.ok) router.refresh()
      else alert(result.error)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className={`inline-flex items-center gap-2 font-mono text-[10px] md:text-xs font-bold uppercase px-3 py-1.5 border transition-colors ${
        isFocus
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:border-primary hover:text-foreground"
      }`}
    >
      {pending ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
      ) : (
        <Star className={`size-3.5 shrink-0 ${isFocus ? "fill-current" : ""}`} />
      )}
      {isFocus ? "포커스 라운드" : "포커스로 설정"}
    </button>
  )
}
