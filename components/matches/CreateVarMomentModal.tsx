"use client"

import { useRef, useState, useEffect } from "react"
import { X, ImageIcon, Video } from "lucide-react"

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
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [description, setDescription] = useState("")
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [timeError, setTimeError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  const setFileFrom = (file: File) => {
    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")
    if (isImage) setAttachedFileName(`IMAGE: ${file.name}`)
    else if (isVideo) setAttachedFileName(`VIDEO: ${file.name}`)
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

  const startValue = parseMinuteValue(startTime)
  const endValue = parseMinuteValue(endTime)
  const endBeforeStart =
    startValue != null && endValue != null && endValue <= startValue

  const validateTime = () => {
    if (startValue == null && endValue == null) {
      setTimeError(null)
      return
    }
    if (startValue != null && endValue != null && endValue <= startValue) {
      setTimeError("종료 시간은 시작 시간보다 늦어야 합니다")
      return
    }
    setTimeError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (endBeforeStart) {
      setTimeError("종료 시간은 시작 시간보다 늦어야 합니다")
      return
    }
    // TODO: server action to create moment (matchId, startTime, endTime, description, media)
    onClose()
    setStartTime("")
    setEndTime("")
    setDescription("")
    setAttachedFileName(null)
    setTimeError(null)
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
                className={`w-full bg-[#1c1f24] border text-foreground px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary ${endBeforeStart ? "border-destructive" : "border-border"}`}
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
            {attachedFileName && (
              <p className="text-[10px] font-mono text-primary mt-1">{attachedFileName}</p>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full border border-border bg-primary text-primary-foreground font-black py-3 text-sm tracking-tighter italic hover:scale-[1.02] transition-transform"
            >
              SEE VAR
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
