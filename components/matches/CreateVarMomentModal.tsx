"use client"

import { useRef, useState, useEffect, startTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, ImageIcon, Video, ChevronDown, BarChart3 } from "lucide-react"
import { createMoment } from "@/lib/actions/moments"
import { uploadMomentMedia } from "@/lib/actions/upload-moment-media"
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/constants/upload"
import { PollEditorDialog } from "@/components/poll/PollEditorDialog"

type Props = {
  open: boolean
  onClose: () => void
  matchId: string
}

type Period = "first" | "second" | "et_first" | "et_second"

/** 추가시간까지 넉넉히 (전반/후반 최대 90분, 연장 전·후반 최대 60분) */
const MAX_FIRST_SECOND = 90   // 45 정규 + 최대 45 추가
const MAX_ET_HALF = 60       // 15 정규 + 최대 45 추가

/** 구간 + 입력 분 → 경기 진행 분(숫자, 서버 저장용) */
function toMatchMinute(period: Period, minute: number): number | null {
  if (period === "first") return minute >= 1 && minute <= MAX_FIRST_SECOND ? minute : null
  if (period === "second") {
    if (minute >= 1 && minute <= 45) return 45 + minute
    if (minute >= 46 && minute <= MAX_FIRST_SECOND) return 90 + (minute - 45)
    return null
  }
  if (period === "et_first") {
    if (minute >= 1 && minute <= 15) return 90 + minute
    if (minute >= 16 && minute <= MAX_ET_HALF) return 105 + (minute - 15)
    return null
  }
  if (period === "et_second") {
    if (minute >= 1 && minute <= 15) return 105 + minute
    if (minute >= 16 && minute <= MAX_ET_HALF) return 120 + (minute - 15)
    return null
  }
  return null
}

function getMaxMinuteForPeriod(period: Period): number {
  if (period === "first") return MAX_FIRST_SECOND
  if (period === "second") return MAX_FIRST_SECOND
  if (period === "et_first") return MAX_ET_HALF
  if (period === "et_second") return MAX_ET_HALF
  return 15
}

/** 구간 + 입력 분 → 화면 표기 (전반 46→45+1, 후반 5→49분, 연장 전반 15→105분 등) */
function formatPeriodMinute(period: Period, minute: number): string {
  if (period === "first") {
    if (minute >= 1 && minute <= 45) return `${minute}분`
    if (minute >= 46) return `45+${minute - 45}`
  }
  if (period === "second") {
    if (minute >= 1 && minute <= 45) return `${45 + minute}분`
    if (minute >= 46) return `90+${minute - 45}`
  }
  if (period === "et_first") {
    if (minute >= 1 && minute <= 15) return `${90 + minute}분`
    if (minute >= 16) return `105+${minute - 15}`
  }
  if (period === "et_second") {
    if (minute >= 1 && minute <= 15) return `${105 + minute}분`
    if (minute >= 16) return `120+${minute - 15}`
  }
  return `${minute}분`
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "first", label: "전반" },
  { value: "second", label: "후반" },
  { value: "et_first", label: "연장 전반" },
  { value: "et_second", label: "연장 후반" },
]

export function CreateVarMomentModal({ open, onClose, matchId }: Props) {
  const router = useRouter()
  const [startPeriod, setStartPeriod] = useState<Period>("first")
  const [startMinute, setStartMinute] = useState<string>("")
  const [description, setDescription] = useState("")
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [fileSizeError, setFileSizeError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)
  const [pollTitle, setPollTitle] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>([])
  const [pollOpen, setPollOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const periodDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!periodDropdownOpen) return
    const close = (e: MouseEvent) => {
      if (periodDropdownRef.current?.contains(e.target as Node)) return
      setPeriodDropdownOpen(false)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [periodDropdownOpen])

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // 첨부 파일 미리보기용 object URL 정리
  useEffect(() => {
    return () => {
      if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    }
  }, [attachedPreviewUrl])

  if (!open) return null

  const setFileFrom = (file: File) => {
    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")
    if (!isImage && !isVideo) return
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileSizeError(`파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 합니다. (현재 ${(file.size / (1024 * 1024)).toFixed(1)}MB)`)
      return
    }
    setFileSizeError(null)
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    setAttachedFile(file)
    setAttachedPreviewUrl(URL.createObjectURL(file))
  }

  const clearAttachment = () => {
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    setAttachedFile(null)
    setAttachedPreviewUrl(null)
    setFileSizeError(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0]
    if (file) setFileFrom(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (!files?.length) return
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        setFileFrom(file)
        return
      }
    }
  }

  const startMinuteNum = startMinute === "" ? null : parseInt(startMinute, 10)
  const startValue =
    startMinuteNum != null && !Number.isNaN(startMinuteNum)
      ? toMatchMinute(startPeriod, startMinuteNum)
      : null

  const validateTime = () => setTimeError(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const maxStart = getMaxMinuteForPeriod(startPeriod)
    if (
      startMinute === "" ||
      startMinuteNum == null ||
      Number.isNaN(startMinuteNum) ||
      startMinuteNum < 1 ||
      startMinuteNum > maxStart
    ) {
      setTimeError(`구간에 맞는 분을 입력해주세요. (전반/후반 1~90, 연장 전·후반 1~60)`)
      return
    }
    if (startValue == null) {
      setTimeError("발생 시각을 확인해주세요.")
      return
    }
    if (attachedFile && attachedFile.size > MAX_FILE_SIZE_BYTES) {
      setSubmitError(`파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 합니다.`)
      return
    }
    setSubmitError(null)
    setFileSizeError(null)
    setPending(true)
    try {
      let mediaUrl: string | null = null
      if (attachedFile) {
        const formData = new FormData()
        formData.set("file", attachedFile)
        const uploadResult = await uploadMomentMedia(formData)
        if (!uploadResult.ok) {
          setSubmitError(uploadResult.error)
          setPending(false)
          return
        }
        mediaUrl = uploadResult.url
      }
      const hasPollData =
        pollTitle.trim().length > 0 || pollOptions.some((o) => o.trim().length > 0)
      const result = await createMoment(matchId, {
        description: description.trim() || null,
        startMinute: startValue ?? null,
        startPeriod,
        startMinuteInPeriod: startMinuteNum ?? null,
        endMinute: null,
        mediaUrl,
        poll: hasPollData
          ? {
              title: pollTitle,
              options: pollOptions,
            }
          : undefined,
      })
      if (result.ok) {
        setStartMinute("")
        setStartPeriod("first")
        setDescription("")
        clearAttachment()
        setPollTitle("")
        setPollOptions([])
        setPollOpen(false)
        setTimeError(null)
        onClose()
        // 서버 revalidate 반영 후 경기 기록 페이지 RSC 갱신
        startTransition(() => {
          router.refresh()
        })
      } else {
        setSubmitError(result.error)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err)
      if (message.includes("413") || message.toLowerCase().includes("too large") || message.includes("entity too large")) {
        setSubmitError(`요청이 너무 큽니다. 사진·영상은 ${MAX_FILE_SIZE_MB}MB 이하로 올려 주세요. 서버(nginx) 제한을 확인해 주세요.`)
      } else {
        setSubmitError(`등록에 실패했습니다. ${message || "네트워크를 확인해 주세요."}`)
      }
    } finally {
      setPending(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      id="var-modal-overlay"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-8"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-card border border-border w-full max-w-[500px] p-6 md:p-8 shadow-[20px_20px_0px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black italic tracking-tighter uppercase">
            판정 이의 제기
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="닫기"
          >
            <X className="size-6" />
          </button>
        </div>

        <form id="var-creation-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-muted-foreground mb-1 uppercase">
              상황 발생 시각
            </label>
            <div className="flex flex-nowrap gap-2 items-center min-w-0">
              <div className="relative shrink-0" ref={periodDropdownRef}>
                <button
                  type="button"
                  onClick={() => setPeriodDropdownOpen((o) => !o)}
                  className="flex items-center justify-between gap-1.5 w-[100px] md:w-[110px] bg-[#1c1f24] border border-border text-foreground px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary hover:border-muted-foreground/50 transition-colors"
                >
                  <span>{PERIOD_OPTIONS.find((o) => o.value === startPeriod)?.label ?? startPeriod}</span>
                  <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${periodDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {periodDropdownOpen && (
                  <div className="absolute top-full left-0 z-10 mt-1 w-[100px] md:w-[110px] rounded-md border border-border bg-card shadow-lg py-1">
                    {PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setStartPeriod(opt.value)
                          const max = getMaxMinuteForPeriod(opt.value)
                          if (startMinute !== "" && (startMinuteNum == null || startMinuteNum > max)) setStartMinute("")
                          setTimeError(null)
                          setPeriodDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 font-mono text-sm transition-colors ${
                          opt.value === startPeriod
                            ? "bg-primary/20 text-primary"
                            : "text-foreground hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={getMaxMinuteForPeriod(startPeriod)}
                placeholder="1~"
                value={startMinute}
                onChange={(e) => {
                  setStartMinute(e.target.value.replace(/\D/g, ""))
                  setTimeError(null)
                }}
                onBlur={validateTime}
                className="shrink-0 w-16 md:w-20 bg-[#1c1f24] border border-border text-foreground px-2.5 py-2.5 font-mono text-sm focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
              <span className="shrink-0 font-mono text-sm text-muted-foreground">분</span>
              {startValue != null && startMinuteNum != null && !Number.isNaN(startMinuteNum) && (
                <span className="shrink-0 font-mono text-sm text-primary">
                  {formatPeriodMinute(startPeriod, startMinuteNum)}
                </span>
              )}
            </div>
            {timeError && (
              <p className="text-[9px] font-mono text-destructive mt-0.5">
                {timeError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-mono text-muted-foreground mb-1 uppercase">
              설명
            </label>
            <div
              className={`relative border-2 border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                rows={4}
                placeholder="판정에 이의를 제기하는 이유를 상세히 설명해주세요. (사진·영상은 여기로 드래그 앤 드롭 가능)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#1c1f24] border-0 text-foreground px-3 py-2.5 pr-12 font-mono text-sm focus:outline-none focus:ring-0 resize-none"
                required
              />
              <div className="absolute right-2 bottom-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="size-8 border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                  title="Attach Image"
                >
                  <ImageIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="size-8 border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                  title="Attach Video"
                >
                  <Video className="size-4" />
                </button>
              </div>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "image")}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "video")}
            />
            {attachedFile && attachedPreviewUrl && (
              <div className="mt-3 flex items-start gap-3 p-3 rounded border border-border bg-muted/30">
                <div className="shrink-0 w-20 h-20 rounded overflow-hidden bg-black border border-border">
                  {attachedFile.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachedPreviewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : attachedFile.type.startsWith("video/") ? (
                    <video
                      src={attachedPreviewUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono text-primary truncate">
                    {attachedFile.type.startsWith("image/") ? "IMAGE" : "VIDEO"}: {attachedFile.name}
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                    {(attachedFile.size / (1024 * 1024)).toFixed(1)}MB
                    {attachedFile.size <= MAX_FILE_SIZE_BYTES ? (
                      <span className="text-primary ml-1">(제한 내)</span>
                    ) : (
                      <span className="text-destructive ml-1">(제한 초과)</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="mt-1 text-[10px] font-mono text-muted-foreground hover:text-destructive"
                  >
                    첨부 제거
                  </button>
                </div>
              </div>
            )}
            {pollTitle && pollOptions.length > 0 ? (
              <div className="mt-3 border border-border rounded bg-muted/40 flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                  <BarChart3 className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground uppercase">
                    투표
                  </p>
                  <p className="text-sm font-mono text-foreground truncate">{pollTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPollOpen(true)}
                  className="text-xs font-mono text-muted-foreground hover:text-primary"
                >
                  수정
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPollOpen(true)}
                className="mt-2 text-xs font-mono text-muted-foreground hover:text-primary"
              >
                + 투표 만들기
              </button>
            )}
            {fileSizeError && (
              <p className="mt-2 text-[10px] font-mono text-destructive" role="alert">
                {fileSizeError}
              </p>
            )}
            <p className="text-sm font-mono text-muted-foreground mt-2">
              사진·영상은 최대 {MAX_FILE_SIZE_MB}MB 첨부 가능 (이미지: jpeg/png/webp/gif, 영상: mp4/webm)
            </p>
          </div>

          {submitError && (
            <p className="text-[10px] font-mono text-destructive" role="alert">
              {submitError}
            </p>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={pending}
              className="w-full border border-border bg-primary text-primary-foreground font-black py-3 text-sm tracking-tighter italic hover:scale-[1.02] transition-transform disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {pending && <Loader2 className="size-4 shrink-0 animate-spin" />}
              {pending ? "등록 중…" : "판정 이의 제기"}
            </button>
          </div>
        </form>
      </div>
      <PollEditorDialog
        open={pollOpen}
        onOpenChange={setPollOpen}
        title={pollTitle}
        options={pollOptions}
        onSave={(t, opts) => {
          setPollTitle(t)
          setPollOptions(opts)
        }}
      />
    </div>
  )
}
