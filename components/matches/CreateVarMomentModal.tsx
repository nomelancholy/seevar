"use client"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, ImageIcon, Video } from "lucide-react"
import { createMoment } from "@/lib/actions/moments"
import { uploadMomentMedia } from "@/lib/actions/upload-moment-media"

type Props = {
  open: boolean
  onClose: () => void
  matchId: string
}

/** "47" → 47, "45+2" → 47(전반 추가 2분), "90+1" → 91 */
function parseMinuteValue(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const plusMatch = t.match(/^(\d+)\s*\+\s*(\d+)$/)
  if (plusMatch) return parseInt(plusMatch[1], 10) + parseInt(plusMatch[2], 10)
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  return null
}

export function CreateVarMomentModal({ open, onClose, matchId }: Props) {
  const router = useRouter()
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [description, setDescription] = useState("")
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachedPreviewUrl, setAttachedPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    setAttachedFile(file)
    setAttachedPreviewUrl(URL.createObjectURL(file))
  }

  const clearAttachment = () => {
    if (attachedPreviewUrl) URL.revokeObjectURL(attachedPreviewUrl)
    setAttachedFile(null)
    setAttachedPreviewUrl(null)
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

  const MAX_DURATION = 15
  const startValue = parseMinuteValue(startTime)
  const endValue = parseMinuteValue(endTime)
  const endBeforeStart =
    startValue != null && endValue != null && endValue <= startValue
  const overDuration =
    startValue != null &&
    endValue != null &&
    endValue > startValue &&
    endValue - startValue > MAX_DURATION

  const validateTime = () => {
    if (startValue == null && endValue == null) {
      setTimeError(null)
      return
    }
    if (startValue != null && endValue != null && endValue <= startValue) {
      setTimeError("종료 시간은 시작 시간보다 늦어야 합니다")
      return
    }
    if (overDuration) {
      setTimeError(`모멘트 구간은 최대 ${MAX_DURATION}분까지 가능합니다`)
      return
    }
    setTimeError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (startTime.trim() && startValue == null) {
      setTimeError("시작 시간 형식이 올바르지 않습니다 (예: 47 또는 45+2)")
      return
    }
    if (endTime.trim() && endValue == null) {
      setTimeError("종료 시간 형식이 올바르지 않습니다 (예: 54 또는 45+4)")
      return
    }
    if (endBeforeStart) {
      setTimeError("종료 시간은 시작 시간보다 늦어야 합니다")
      return
    }
    if (overDuration) {
      setTimeError(`모멘트 구간은 최대 ${MAX_DURATION}분까지 가능합니다`)
      return
    }
    setSubmitError(null)
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
      const result = await createMoment(matchId, {
        description: description.trim() || null,
        startMinute: startValue ?? null,
        endMinute: endValue ?? null,
        mediaUrl,
      })
      if (result.ok) {
        setStartTime("")
        setEndTime("")
        setDescription("")
        clearAttachment()
        setTimeError(null)
        onClose()
        router.refresh()
      } else {
        setSubmitError(result.error)
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
            CREATE VAR MOMENT
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground mb-1 uppercase">
                Start Time (Min)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 47 or 45+2"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setTimeError(null)
                }}
                onBlur={validateTime}
                className="w-full bg-[#1c1f24] border border-border text-foreground px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary"
                required
              />
              <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                전반 추가 45+2, 후반 47분 등
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground mb-1 uppercase">
                End Time (Min)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 54 or 45+4"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setTimeError(null)
                }}
                onBlur={validateTime}
                className={`w-full bg-[#1c1f24] border text-foreground px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary ${endBeforeStart || overDuration ? "border-destructive" : "border-border"}`}
                required
              />
              {timeError && (
                <p className="text-[9px] font-mono text-destructive mt-0.5">
                  {timeError}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-muted-foreground mb-1 uppercase">
              Description
            </label>
            <div
              className={`relative border-2 border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                rows={4}
                placeholder="Describe why VAR is needed... (사진·영상은 여기로 드래그 앤 드롭 가능)"
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
              {pending ? "등록 중…" : "SEE VAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
