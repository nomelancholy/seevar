"use client"

import dynamic from "next/dynamic"
import { startTransition, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AlertCircle, ArrowLeft, Loader2, MessageSquarePlus, Star, X } from "lucide-react"
import { LoginRequiredDialog } from "@/components/auth/LoginRequiredDialog"
import { ModerationConfirmDialog } from "@/components/moderation/ModerationConfirmDialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmblemImage } from "@/components/ui/EmblemImage"
import { createRefereeReview } from "@/lib/actions/referee-reviews"
import { REFEREE_REVIEW_COMMENT_MAX_LENGTH } from "@/lib/constants"

const CreateVarMomentModal = dynamic(
  () =>
    import("@/components/matches/CreateVarMomentModal").then((module) => ({
      default: module.CreateVarMomentModal,
    })),
  { ssr: false },
)

type RefereeRole = "MAIN" | "ASSISTANT" | "VAR" | "WAITING"

export type RoundActionMatch = {
  id: string
  matchPath: string
  date: string
  timeStr: string
  venue: string
  homeName: string
  awayName: string
  homeEmblem: string
  awayEmblem: string
  scoreHome: number | null
  scoreAway: number | null
  status: string
  homeTeamId: string
  awayTeamId: string
  matchReferees: Array<{
    id: string
    role: string
    referee: { id: string; name: string; slug: string }
  }>
}

type RatingSlot = {
  id: string
  role: RefereeRole
  refereeIds: string[]
  roleLabel: string
  names: string
}

const ROLE_LABEL: Record<RefereeRole, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  WAITING: "대기심",
  VAR: "VAR",
}

const ROLE_ORDER: RefereeRole[] = ["MAIN", "ASSISTANT", "WAITING", "VAR"]

function buildRatingSlots(match: RoundActionMatch): RatingSlot[] {
  const slots: RatingSlot[] = []
  for (const role of ROLE_ORDER) {
    const assignments = match.matchReferees.filter((item) => item.role === role)
    if (role === "VAR" && assignments.length > 0) {
      slots.push({
        id: `var-${assignments.map((item) => item.referee.id).join("-")}`,
        role,
        refereeIds: assignments.map((item) => item.referee.id),
        roleLabel: ROLE_LABEL[role],
        names: assignments.map((item) => item.referee.name).join(", "),
      })
      continue
    }
    for (const assignment of assignments) {
      slots.push({
        id: assignment.id,
        role,
        refereeIds: [assignment.referee.id],
        roleLabel: ROLE_LABEL[role],
        names: assignment.referee.name,
      })
    }
  }
  return slots
}

function MatchIdentity({ match }: { match: RoundActionMatch }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <EmblemImage
        src={match.homeEmblem}
        width={36}
        height={36}
        className="size-8 shrink-0 object-contain md:size-9"
      />
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-sm font-black md:text-base">
          {match.homeName} <span className="text-muted-foreground">vs</span> {match.awayName}
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground md:text-xs">
          {[match.date, match.timeStr, match.venue].filter(Boolean).join(" · ")}
        </p>
      </div>
      <EmblemImage
        src={match.awayEmblem}
        width={36}
        height={36}
        className="size-8 shrink-0 object-contain md:size-9"
      />
    </div>
  )
}

function QuickRatingForm({
  match,
  onBack,
}: {
  match: RoundActionMatch
  onBack: () => void
}) {
  const router = useRouter()
  const slots = useMemo(() => buildRatingSlots(match), [match])
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id ?? "")
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [moderation, setModeration] = useState<{
    scores: Record<string, number>
    flagged: boolean
  } | null>(null)
  const [forcePending, setForcePending] = useState(false)

  const selected = slots.find((slot) => slot.id === selectedSlotId) ?? slots[0]

  const saveForSlot = async (forceSubmitAfterModeration: boolean) => {
    if (!selected || rating < 1) return
    const refereeIds = selected.refereeIds
    for (const refereeId of refereeIds) {
      const result = await createRefereeReview(
        match.id,
        refereeId,
        selected.role,
        rating,
        comment.trim() || null,
        forceSubmitAfterModeration,
      )
      if (!result.ok) return result
    }
    return { ok: true as const }
  }

  const finishSave = () => {
    setSaved(true)
    setError(null)
    startTransition(() => router.refresh())
  }

  const handleSubmit = async () => {
    if (!selected) {
      setError("평가할 심판을 선택해주세요.")
      return
    }
    if (rating < 1) {
      setError("별점을 선택해주세요.")
      return
    }
    setPending(true)
    setError(null)
    setSaved(false)
    const result = await saveForSlot(false)
    setPending(false)
    if (!result) return
    if (result.ok) {
      finishSave()
      return
    }
    if ("code" in result && result.code === "MODERATION_WARNING") {
      setModeration({ scores: result.scores, flagged: result.flagged })
      return
    }
    setError(result.error)
  }

  const handleForceSubmit = async () => {
    setForcePending(true)
    const result = await saveForSlot(true)
    setForcePending(false)
    if (result?.ok) {
      setModeration(null)
      finishSave()
      return
    }
    if (result && "error" in result) setError(result.error)
  }

  const selectSlot = (slotId: string) => {
    setSelectedSlotId(slotId)
    setRating(0)
    setComment("")
    setError(null)
    setSaved(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        경기 다시 선택
      </button>

      <div className="border border-border bg-background/50 p-3 md:p-4">
        <MatchIdentity match={match} />
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          평가할 심판
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => selectSlot(slot.id)}
              className={`min-w-0 border p-3 text-left transition-colors ${
                selected?.id === slot.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-muted-foreground/60"
              }`}
            >
              <span className="block font-mono text-[9px] font-black uppercase text-primary">
                {slot.roleLabel}
              </span>
              <span className="mt-1 block truncate text-xs font-bold md:text-sm">
                {slot.names}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="space-y-4 border border-border bg-muted/20 p-4">
          <div>
            <p className="mb-2 text-sm font-bold">
              {selected.roleLabel} · {selected.names}
            </p>
            <div className="flex gap-1" aria-label="별점 선택">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setRating(value)
                    setError(null)
                    setSaved(false)
                  }}
                  className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`${value}점`}
                >
                  <Star
                    className={`size-7 ${
                      value <= rating
                        ? "fill-primary text-primary"
                        : "fill-transparent text-muted-foreground/50"
                    }`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={`quick-review-${match.id}`} className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>한줄평 (선택)</span>
              <span>{comment.length}/{REFEREE_REVIEW_COMMENT_MAX_LENGTH}</span>
            </label>
            <textarea
              id={`quick-review-${match.id}`}
              value={comment}
              onChange={(event) => {
                setComment(event.target.value.slice(0, REFEREE_REVIEW_COMMENT_MAX_LENGTH))
                setSaved(false)
              }}
              rows={3}
              maxLength={REFEREE_REVIEW_COMMENT_MAX_LENGTH}
              placeholder="이 경기의 심판 판정을 한줄로 남겨보세요."
              className="w-full resize-none border border-border bg-background p-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {error ? (
            <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-xs font-bold text-primary" role="status">
              평가가 저장되었습니다. 다른 심판도 바로 평가할 수 있어요.
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || rating < 1}
            className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-black italic text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Star className="size-4" aria-hidden />}
            {pending ? "저장 중…" : "심판 평가 저장"}
          </button>
          <p className="text-center font-mono text-[9px] text-muted-foreground">
            이미 평가했다면 같은 심판의 평가가 수정됩니다.
          </p>
        </div>
      ) : (
        <p className="py-8 text-center font-mono text-xs text-muted-foreground">
          배정된 심판이 없습니다.
        </p>
      )}

      <ModerationConfirmDialog
        open={moderation !== null}
        onOpenChange={(open) => !open && setModeration(null)}
        scores={moderation?.scores ?? {}}
        flagged={moderation?.flagged ?? false}
        onEdit={() => setModeration(null)}
        onConfirmAnyway={handleForceSubmit}
        confirmAnywayPending={forcePending}
      />
    </>
  )
}

function MatchPicker({
  matches,
  action,
  onSelect,
}: {
  matches: RoundActionMatch[]
  action: "rating" | "moment"
  onSelect: (match: RoundActionMatch) => void
}) {
  return (
    <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
      {matches.map((match) => {
        const isCancelled = match.status === "CANCELLED"
        const hasReferees = match.matchReferees.length > 0
        const disabled = isCancelled || !hasReferees
        const reason = isCancelled
          ? "취소된 경기"
          : !hasReferees
            ? "심판 배정 전"
            : action === "rating"
              ? "평가하기"
              : "쟁점 만들기"
        return (
          <button
            key={match.id}
            type="button"
            onClick={() => onSelect(match)}
            disabled={disabled}
            className="w-full border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <MatchIdentity match={match} />
            <span className={`mt-2 block text-center font-mono text-[9px] font-bold ${disabled ? "text-muted-foreground" : "text-primary"}`}>
              {reason}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function RoundQuickActions({
  leagueName,
  roundNumber,
  matches,
  placement = "standalone",
}: {
  leagueName: string
  roundNumber: number
  matches: RoundActionMatch[]
  placement?: "standalone" | "header"
}) {
  const { status: sessionStatus } = useSession()
  const [action, setAction] = useState<"rating" | "moment" | null>(null)
  const [ratingMatch, setRatingMatch] = useState<RoundActionMatch | null>(null)
  const [momentMatchId, setMomentMatchId] = useState<string | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)

  const openAction = (nextAction: "rating" | "moment") => {
    if (sessionStatus !== "authenticated") {
      setLoginOpen(true)
      return
    }
    setRatingMatch(null)
    setAction(nextAction)
  }

  const closeAction = () => {
    setAction(null)
    setRatingMatch(null)
  }

  const selectMatch = (match: RoundActionMatch) => {
    if (action === "rating") {
      setRatingMatch(match)
      return
    }
    closeAction()
    window.setTimeout(() => setMomentMatchId(match.id), 120)
  }

  return (
    <>
      <div
        className={
          placement === "header"
            ? "flex items-center gap-1 md:gap-2"
            : "grid grid-cols-2 gap-2 border-x border-b border-border bg-card/40 p-3 md:flex md:justify-end md:p-4"
        }
      >
        <button
          type="button"
          onClick={() => openAction("rating")}
          disabled={sessionStatus === "loading" || matches.length === 0}
          className={`inline-flex items-center justify-center gap-1.5 border border-primary bg-primary font-black italic text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 ${
            placement === "header"
              ? "size-8 px-0 text-[10px] sm:w-auto sm:px-2.5 md:h-9 md:px-3 md:text-xs"
              : "px-3 py-2.5 text-[10px] md:text-xs"
          }`}
          aria-label="이 라운드 심판 평가"
          title="이 라운드 심판 평가"
        >
          <Star className="size-3.5" aria-hidden />
          <span className={placement === "header" ? "hidden sm:inline" : undefined}>
            이 라운드 심판 평가
          </span>
        </button>
        <button
          type="button"
          onClick={() => openAction("moment")}
          disabled={sessionStatus === "loading" || matches.length === 0}
          className={`inline-flex items-center justify-center gap-1.5 border border-border bg-background font-black italic transition-colors hover:border-primary hover:text-primary disabled:opacity-40 ${
            placement === "header"
              ? "size-8 px-0 text-[10px] sm:w-auto sm:px-2.5 md:h-9 md:px-3 md:text-xs"
              : "px-3 py-2.5 text-[10px] md:text-xs"
          }`}
          aria-label="쟁점 순간 만들기"
          title="쟁점 순간 만들기"
        >
          <MessageSquarePlus className="size-3.5" aria-hidden />
          <span className={placement === "header" ? "hidden sm:inline" : undefined}>
            쟁점 순간 만들기
          </span>
        </button>
      </div>

      <Dialog open={action !== null} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="max-h-[90vh] max-w-[680px] overflow-y-auto p-4 md:p-6">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>
              {action === "rating" ? "이 라운드 심판 평가" : "라운드 쟁점 순간 만들기"}
            </DialogTitle>
            <DialogDescription>
              {leagueName} · Round {roundNumber}
              {!ratingMatch ? " · 먼저 경기를 선택해주세요." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="닫기"
            >
              <X className="size-5" aria-hidden />
            </button>
          </DialogClose>

          {action && !ratingMatch ? (
            <MatchPicker matches={matches} action={action} onSelect={selectMatch} />
          ) : null}
          {action === "rating" && ratingMatch ? (
            <QuickRatingForm
              key={ratingMatch.id}
              match={ratingMatch}
              onBack={() => setRatingMatch(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {momentMatchId ? (
        <CreateVarMomentModal
          open
          onClose={() => setMomentMatchId(null)}
          matchId={momentMatchId}
        />
      ) : null}

      <LoginRequiredDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message="심판 평가와 쟁점 순간 등록은 로그인 후 이용할 수 있습니다."
      />
    </>
  )
}
