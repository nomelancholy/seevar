"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type HotMomentItem = {
  momentId?: string
  matchId: string
  league: string
  homeName: string
  awayName: string
  homeEmblem: string
  awayEmblem: string
  time: string
  varCount: number
  commentCount: number
}

type CommentAuthor = { id: string; name: string | null }
type CommentRow = {
  id: string
  content: string
  mediaUrl?: string | null
  createdAt: string
  author: CommentAuthor
  replies?: CommentRow[]
}

type MomentDetail = {
  id: string
  title: string | null
  description: string | null
  startMinute: number | null
  endMinute: number | null
  seeVarCount: number
  commentCount: number
  author?: { id: string; name: string | null }
  match: {
    homeTeam: { name: string; emblemPath: string | null }
    awayTeam: { name: string; emblemPath: string | null }
    round: { league: { name: string }; number: number }
  }
  comments: CommentRow[]
}

type Props = {
  open: boolean
  onClose: () => void
  moment: HotMomentItem | null
}

type AttachedItem = { id: string; file: File }

function SortableAttachedItem({ item, onRemove }: { item: AttachedItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const isImage = item.file.type.startsWith("image/")
  const isVideo = item.file.type.startsWith("video/")
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(item.file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview(null)
  }, [item.file, isImage])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded border border-border bg-muted/50 ${isDragging ? "opacity-50 z-10" : ""}`}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
        aria-label="드래그하여 순서 변경"
        {...attributes}
        {...listeners}
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      {preview ? (
        <img src={preview} alt="" className="w-10 h-10 object-cover rounded shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 text-[10px] font-mono">
          {isVideo ? "VID" : "FILE"}
        </div>
      )}
      <span className="min-w-0 truncate text-xs font-mono text-muted-foreground flex-1">
        {item.file.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-1 text-muted-foreground hover:text-destructive"
        aria-label="첨부 제거"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function MomentCommentModal({ open, onClose, moment }: Props) {
  const [detail, setDetail] = useState<MomentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [attachments, setAttachments] = useState<AttachedItem[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileInputId = useId()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setAttachments((prev) => {
        const idx = prev.findIndex((a) => a.id === active.id)
        const overIdx = prev.findIndex((a) => a.id === over.id)
        if (idx === -1 || overIdx === -1) return prev
        return arrayMove(prev, idx, overIdx)
      })
    }
  }, [])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    const next = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    )
    setAttachments((prev) => [
      ...prev,
      ...next.map((file) => ({ id: `f-${Date.now()}-${Math.random().toString(36).slice(2)}`, file })),
    ])
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setCommentText("")
      setAttachments([])
    }
  }, [open])

  useEffect(() => {
    if (!open || !moment?.momentId) {
      setDetail(null)
      return
    }
    setLoading(true)
    fetch(`/api/moments/${moment.momentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDetail(data))
      .finally(() => setLoading(false))
  }, [open, moment?.momentId])

  if (!open) return null

  const title = moment ? `${moment.homeName} vs ${moment.awayName}` : ""
  const time = moment?.time ?? ""
  const varCount = detail?.seeVarCount ?? moment?.varCount ?? 0
  const comments = detail?.comments ?? []

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="모멘트 댓글"
    >
      <div className="bg-card border border-border w-full max-w-[700px] h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-4 md:p-6 pr-12 border-b border-border shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">
                {title}
              </h4>
              <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-muted-foreground">
                <span>{moment?.league ?? ""}</span>
                <span className="bg-muted px-2 py-0.5 rounded">{time}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 text-muted-foreground hover:text-foreground rounded"
              aria-label="닫기"
            >
              <X className="size-6" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-end items-center gap-3">
            <div className="text-right">
              <span className="font-mono text-[10px] text-primary font-bold block">
                CURRENT SEE VAR
              </span>
              <span className="text-xl font-black italic font-mono text-primary">
                {varCount.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              className="border border-primary text-primary font-black italic font-mono text-xs px-4 py-2 rounded hover:bg-primary hover:text-primary-foreground transition-colors"
              title="이 순간에 공감·추천"
            >
              SEE VAR
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 min-h-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-sm">
              로딩 중...
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-sm">
              아직 댓글이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="p-4 md:p-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted border border-border flex items-center justify-center" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] md:text-xs font-bold text-foreground">
                          {c.author?.name ?? "Anonymous"}
                        </span>
                        <span className="font-mono text-[8px] text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm mt-1 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {c.content}
                      </p>
                      {c.mediaUrl && (
                        <div className="mt-2 rounded overflow-hidden border border-border max-w-[280px]">
                          {c.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.mediaUrl}
                              alt=""
                              className="w-full max-h-48 object-cover"
                            />
                          ) : (
                            <video
                              src={c.mediaUrl}
                              controls
                              className="w-full max-h-48"
                              preload="metadata"
                            />
                          )}
                        </div>
                      )}
                      {c.replies && c.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-border space-y-2">
                          {c.replies.map((r) => (
                            <div key={r.id}>
                              <span className="text-[10px] font-bold">
                                {r.author?.name ?? "Anonymous"}
                              </span>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {r.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t border-border shrink-0 space-y-3">
          <div className="flex gap-2 items-center min-h-10">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="QUICK COMMENT..."
              rows={1}
              className="flex-1 min-w-0 h-10 min-h-10 py-2 bg-muted border border-border px-3 text-xs font-mono focus:border-primary outline-none rounded resize-none"
            />
            <label
              htmlFor={fileInputId}
              className="shrink-0 h-10 w-10 flex items-center justify-center border border-border rounded text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
              title="사진/영상 첨부"
            >
              <ImagePlus className="size-5" />
              <span className="sr-only">사진 또는 영상 첨부</span>
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              className="shrink-0 h-10 bg-primary text-primary-foreground px-4 font-black italic font-mono text-xs hover:opacity-90 transition-opacity flex items-center rounded"
            >
              작성
            </button>
          </div>
          <div
            className={`rounded border border-dashed p-3 min-h-[56px] transition-colors ${isDraggingOver ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDraggingOver(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDraggingOver(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDraggingOver(false)
              addFiles(e.dataTransfer.files)
            }}
          >
            {attachments.length === 0 ? (
              <p className="text-[10px] font-mono text-muted-foreground text-center py-1">
                사진/영상을 여기에 드래그 앤 드롭
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={attachments.map((a) => a.id)}>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((item) => (
                      <SortableAttachedItem
                        key={item.id}
                        item={item}
                        onRemove={() => removeAttachment(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
