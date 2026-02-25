"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { completeOnboarding } from "@/lib/actions/onboarding"

type TeamOption = { id: string; name: string; emblemPath: string | null }

type Props = { teams: TeamOption[] }

export function OnboardingForm({ teams }: Props) {
  const router = useRouter()
  const [nickname, setNickname] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedTeamId) {
      setError("응원팀을 선택해 주세요.")
      return
    }
    setPending(true)
    try {
      const result = await completeOnboarding(nickname.trim(), selectedTeamId)
      if (result.ok) {
        router.push("/")
        router.refresh()
        return
      }
      setError(result.error)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
      {error && (
        <p className="text-destructive text-xs font-mono" role="alert">
          {error}
        </p>
      )}
      <div>
        <label className="block text-[8px] md:text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest">
          Your Nickname
        </label>
        <Input
          type="text"
          placeholder="e.g. VAR_MASTER"
          className="p-3 md:p-4 text-xs md:text-sm font-mono"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-[8px] md:text-[10px] font-mono text-muted-foreground mb-4 uppercase tracking-widest">
          Select Supporting Team
        </label>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-2 scrollbar-team">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setSelectedTeamId(team.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-md border bg-card transition-all",
                selectedTeamId === team.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              {team.emblemPath ? (
                <img
                  src={team.emblemPath}
                  alt=""
                  className="w-8 h-8 md:w-9 md:h-9 object-contain"
                />
              ) : (
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-muted shrink-0" />
              )}
              <span className="text-[9px] md:text-[10px] font-black font-mono text-center leading-tight">
                {team.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full mt-8 font-black text-sm py-6 gap-2"
        disabled={pending}
      >
        {pending && <Loader2 className="size-5 shrink-0 animate-spin" />}
        {pending ? "저장 중..." : "START SEE VAR"}
      </Button>
    </form>
  )
}
