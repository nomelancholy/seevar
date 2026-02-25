"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { updateProfile, uploadProfileImage } from "@/app/my/actions"

type Team = { id: string; name: string; emblemPath: string | null }

type Props = {
  initialName: string | null
  initialImage: string | null
  initialSupportingTeamId: string | null
  teams: Team[]
  linkedAccountLabel?: string
  linkedAccountId?: string
}

export function MyInformationForm({
  initialName,
  initialImage,
  initialSupportingTeamId,
  teams,
  linkedAccountLabel = "NAVER SOCIAL LOGIN",
  linkedAccountId,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(initialName ?? "")
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage)
  const [supportingTeamId, setSupportingTeamId] = useState<string | null>(
    initialSupportingTeamId
  )
  const [pending, setPending] = useState(false)
  const [imagePending, setImagePending] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setMessage(null)
    const result = await updateProfile({
      name: name.trim() || null,
      supportingTeamId,
    })
    setPending(false)
    if (result.ok) {
      setMessage({ type: "ok", text: "저장되었습니다." })
      router.refresh()
    } else {
      setMessage({ type: "error", text: result.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10">
      {/* Linked Account */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-muted/50 border border-border gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#03C75A] rounded-full flex items-center justify-center shrink-0">
            <svg
              width="16"
              height="16"
              fill="white"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
            </svg>
          </div>
          <div>
            <p className="text-[8px] md:text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Linked Account
            </p>
            <p className="text-xs md:text-sm font-bold">{linkedAccountLabel}</p>
          </div>
        </div>
        {linkedAccountId && (
          <span className="text-[8px] font-mono text-muted-foreground">
            ID: {linkedAccountId}
          </span>
        )}
      </div>

      {/* Profile Image + Nickname */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="프로필 사진 선택"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setImagePending(true)
          setMessage(null)
          const formData = new FormData()
          formData.set("image", file)
          const result = await uploadProfileImage(formData)
          setImagePending(false)
          e.target.value = ""
          if (result.ok) {
            setImageUrl(result.url)
            setMessage({ type: "ok", text: "프로필 사진이 변경되었습니다." })
            router.refresh()
          } else {
            setMessage({ type: "error", text: result.error })
          }
        }}
      />
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imagePending}
          className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-border bg-muted flex items-center justify-center relative group cursor-pointer shrink-0 overflow-hidden disabled:opacity-70 disabled:cursor-wait"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="프로필"
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              width="32"
              height="32"
              className="md:w-10 md:h-10 text-muted-foreground shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              aria-hidden
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
          <div
            className={`absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center gap-1 transition-opacity ${imagePending ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            {imagePending ? (
              <Loader2 className="size-6 text-white animate-spin shrink-0" />
            ) : null}
            <span className="text-[7px] md:text-[8px] font-black font-mono uppercase text-white">
              {imagePending ? "업로드 중…" : "사진 변경"}
            </span>
          </div>
        </button>
        <div className="flex-1 w-full">
          <label
            htmlFor="nickname"
            className="block text-[8px] md:text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest"
          >
            Nickname
          </label>
          <input
            id="nickname"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-card border border-border text-foreground px-3 py-2.5 md:py-3 font-mono text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="닉네임"
          />
        </div>
      </div>

      {/* Supporting Team */}
      <div>
        <label className="block text-[10px] md:text-xs font-mono text-muted-foreground mb-4 uppercase tracking-widest">
          Supporting Team
        </label>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto pr-2 scrollbar-team">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setSupportingTeamId(team.id)}
              className={`flex flex-col items-center gap-2 p-3 md:p-4 bg-card border transition-all text-center rounded-md ${
                supportingTeamId === team.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              {team.emblemPath ? (
                <img
                  src={team.emblemPath}
                  alt=""
                  className="w-9 h-9 md:w-11 md:h-11 object-contain"
                />
              ) : (
                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-muted shrink-0" />
              )}
              <span className="font-mono text-[10px] md:text-xs font-black leading-tight">
                {team.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p
          className={`text-[10px] md:text-xs font-mono ${
            message.type === "ok" ? "text-primary" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Actions */}
      <div className="pt-6 md:pt-8 flex flex-col md:flex-row justify-end gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full md:w-auto px-8 py-3 text-[10px] md:text-xs font-black italic font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          CANCEL
        </button>
        <button
          type="submit"
          disabled={pending}
          className="w-full md:w-auto border border-border bg-primary text-primary-foreground px-8 md:px-12 py-3 text-[10px] md:text-xs font-black italic tracking-tighter uppercase hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {pending && <Loader2 className="size-4 shrink-0 animate-spin" />}
          {pending ? "저장 중…" : "SAVE CHANGES"}
        </button>
      </div>
    </form>
  )
}
