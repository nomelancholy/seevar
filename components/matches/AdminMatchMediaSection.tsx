"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { updateMatchSchedule } from "@/lib/actions/admin-matches"

type Props = {
  matchId: string
  initialYoutubeUrl?: string | null
  initialInstagramUrl?: string | null
}

export function AdminMatchMediaSection({ matchId, initialYoutubeUrl, initialInstagramUrl }: Props) {
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl || "")
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl || "")
  const [isEditing, setIsEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setPending(true)
    setError(null)
    const result = await updateMatchSchedule(matchId, {
      youtubeUrl: youtubeUrl.trim() || null,
      instagramUrl: instagramUrl.trim() || null,
    })
    setPending(false)
    if (result.ok) {
      setIsEditing(false)
    } else {
      setError(result.error)
    }
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full border border-border bg-muted/30 px-4 py-3 font-mono text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        [관리자] 영상 링크 수정
      </button>
    )
  }

  return (
    <div className="p-4 md:p-6 border border-border bg-muted/10 space-y-4">
      <div className="font-mono text-xs font-bold text-foreground mb-4">
        [관리자] 경기 영상 링크 등록
      </div>
      
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">YouTube URL</span>
        <input
          type="url"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>
      
      <label className="block font-mono text-xs">
        <span className="block text-muted-foreground mb-1">Instagram URL</span>
        <input
          type="url"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://www.instagram.com/p/..."
          className="w-full bg-background border border-border px-3 py-2 focus:border-primary outline-none"
        />
      </label>

      {error && <p className="text-destructive text-xs font-mono">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="border border-primary bg-primary text-primary-foreground px-4 py-2 font-mono text-xs disabled:opacity-50 inline-flex items-center gap-2"
        >
          {pending && <Loader2 className="size-3.5 shrink-0 animate-spin" />}
          {pending ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          disabled={pending}
          className="border border-border px-4 py-2 font-mono text-xs text-muted-foreground hover:bg-muted/50"
        >
          취소
        </button>
      </div>
    </div>
  )
}
