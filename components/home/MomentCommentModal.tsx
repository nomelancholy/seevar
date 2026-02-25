"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { ImagePlus, Heart, Loader2, MessageCircle, Pencil, Flag, Trash2, X } from "lucide-react"
import {
  createComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  reportComment,
} from "@/lib/actions/comments"
import { toggleMomentSeeVar } from "@/lib/actions/moments"
import { uploadMomentMedia } from "@/lib/actions/upload-moment-media"
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

type CommentAuthor = { id: string; name: string | null; image?: string | null }
type CommentReaction = { type: string; userId: string }
type CommentParent = { id: string; author?: { name: string | null } | null }
type CommentRow = {
  id: string
  content: string
  mediaUrl?: string | null
  createdAt: string
  author: CommentAuthor
  parent?: CommentParent | null
  reactions?: CommentReaction[]
  replies?: CommentRow[]
}

/** 대댓글을 깊이 무관하게 평탄화(생성일 순). 들여쓰기는 모두 동일하게 유지. */
function flattenReplies(replies: CommentRow[] | undefined): CommentRow[] {
  if (!replies?.length) return []
  const out: CommentRow[] = []
  function walk(list: CommentRow[]) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    for (const r of sorted) {
      out.push(r)
      if (r.replies?.length) walk(r.replies)
    }
  }
  walk(replies)
  return out
}

type MomentDetail = {
  id: string
  title: string | null
  description: string | null
  startMinute: number | null
  endMinute: number | null
  seeVarCount: number
  commentCount: number
  currentUserId?: string | null
  author?: { id: string; name: string | null }
  hasSeeVarByMe?: boolean
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

const refetchDetail = (momentId: string, setDetail: (d: MomentDetail | null) => void) => {
  fetch(`/api/moments/${momentId}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => setDetail(data))
}

export function MomentCommentModal({ open, onClose, moment }: Props) {
  const [detail, setDetail] = useState<MomentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [attachments, setAttachments] = useState<AttachedItem[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [submitPending, setSubmitPending] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null)
  const [replyPreviewUrl, setReplyPreviewUrl] = useState<string | null>(null)
  const [replyPending, setReplyPending] = useState(false)
  const [seeVarPending, setSeeVarPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const submitLockRef = useRef(false)
  const replyLockRef = useRef(false)
  const replyPreviewUrlRef = useRef<string | null>(null)
  const fileInputId = useId()
  const replyFileInputId = useId()

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
      setEditingCommentId(null)
      setEditingContent("")
      setReplyToCommentId(null)
      setReplyText("")
      setReplyAttachment(null)
      if (replyPreviewUrlRef.current) {
        URL.revokeObjectURL(replyPreviewUrlRef.current)
        replyPreviewUrlRef.current = null
      }
      setReplyPreviewUrl(null)
      setActionError(null)
    }
  }, [open])

  const fetchDetail = useCallback(() => {
    if (!moment?.momentId) return
    setLoading(true)
    fetch(`/api/moments/${moment.momentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDetail(data))
      .finally(() => setLoading(false))
  }, [moment?.momentId])

  useEffect(() => {
    if (!open || !moment?.momentId) {
      setDetail(null)
      return
    }
    fetchDetail()
  }, [open, moment?.momentId, fetchDetail])

  const handleSubmitComment = useCallback(async () => {
    if (!detail?.id || !commentText.trim()) return
    if (submitLockRef.current) return
    submitLockRef.current = true
    setActionError(null)
    setSubmitPending(true)
    const textToSend = commentText.trim()
    setCommentText("")
    try {
      const result = await createComment(detail.id, { content: textToSend })
      if (result.ok) {
        refetchDetail(detail.id, setDetail)
      } else {
        setActionError(result.error)
        setCommentText(textToSend)
      }
    } finally {
      setSubmitPending(false)
      submitLockRef.current = false
    }
  }, [detail?.id, commentText])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (e.repeat) return
        handleSubmitComment()
      }
    },
    [handleSubmitComment]
  )

  const handleSaveEdit = useCallback(
    async (commentId: string) => {
      const content = editingContent.trim()
      if (!content) return
      setActionError(null)
      const result = await updateComment(commentId, content)
      if (result.ok) {
        setEditingCommentId(null)
        setEditingContent("")
        if (detail?.id) refetchDetail(detail.id, setDetail)
      } else {
        setActionError(result.error)
      }
    },
    [editingContent, detail?.id]
  )

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!confirm("이 댓글을 삭제할까요?")) return
      setActionError(null)
      const result = await deleteComment(commentId)
      if (result.ok && detail?.id) refetchDetail(detail.id, setDetail)
      else if (!result.ok) setActionError(result.error)
    },
    [detail?.id]
  )

  const handleToggleLike = useCallback(
    async (commentId: string) => {
      if (!detail?.currentUserId) return
      setActionError(null)
      const result = await toggleCommentLike(commentId)
      if (result.ok && detail?.id) refetchDetail(detail.id, setDetail)
      else if (!result.ok) setActionError(result.error)
    },
    [detail?.id, detail?.currentUserId]
  )

  const handleReport = useCallback(
    async (commentId: string) => {
      if (!detail?.currentUserId) return
      const reason = "ABUSE"
      if (!confirm("이 댓글을 신고할까요?")) return
      setActionError(null)
      const result = await reportComment(commentId, reason)
      if (result.ok) {
        if (detail?.id) refetchDetail(detail.id, setDetail)
      } else {
        setActionError(result.error)
      }
    },
    [detail?.id, detail?.currentUserId]
  )

  const handleReplyFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) return
    if (replyPreviewUrlRef.current) {
      URL.revokeObjectURL(replyPreviewUrlRef.current)
      replyPreviewUrlRef.current = null
    }
    const url = URL.createObjectURL(file)
    replyPreviewUrlRef.current = url
    setReplyPreviewUrl(url)
    setReplyAttachment(file)
  }, [])

  const clearReplyAttachment = useCallback(() => {
    setReplyAttachment(null)
    setReplyPreviewUrl(null)
    if (replyPreviewUrlRef.current) {
      URL.revokeObjectURL(replyPreviewUrlRef.current)
      replyPreviewUrlRef.current = null
    }
  }, [])

  const handleSubmitReply = useCallback(
    async (parentId: string) => {
      const content = replyText.trim()
      const hasContent = !!content
      const hasMedia = !!replyAttachment
      if ((!hasContent && !hasMedia) || !detail?.id) return
      if (replyLockRef.current) return
      replyLockRef.current = true
      setActionError(null)
      setReplyPending(true)
      const textToSend = content || " "
      setReplyText("")
      const fileToUpload = replyAttachment
      setReplyAttachment(null)
      if (replyPreviewUrlRef.current) {
        URL.revokeObjectURL(replyPreviewUrlRef.current)
        replyPreviewUrlRef.current = null
      }
      setReplyPreviewUrl(null)
      try {
        let mediaUrl: string | null = null
        if (fileToUpload) {
          const fd = new FormData()
          fd.append("file", fileToUpload)
          const upload = await uploadMomentMedia(fd)
          if (!upload.ok) {
            setActionError(upload.error)
            setReplyText(content || "")
            return
          }
          mediaUrl = upload.url
        }
        const result = await createComment(detail.id, { content: textToSend, parentId, mediaUrl })
        if (result.ok) {
          setReplyToCommentId(null)
          refetchDetail(detail.id, setDetail)
        } else {
          setActionError(result.error)
          setReplyText(content || "")
        }
      } finally {
        setReplyPending(false)
        replyLockRef.current = false
      }
    },
    [detail?.id, replyText, replyAttachment]
  )

  if (!open) return null

  const title = moment ? `${moment.homeName} vs ${moment.awayName}` : ""
  const time = moment?.time ?? ""
  const varCount = detail?.seeVarCount ?? moment?.varCount ?? 0
  const comments = detail?.comments ?? []
  const isSeeVarByMe = Boolean(detail?.hasSeeVarByMe ?? (detail?.currentUserId && detail?.author?.id && detail.currentUserId === detail.author.id))
  const currentUserId = detail?.currentUserId ?? null

  const getLikeState = (c: CommentRow) => {
    const reactions = c.reactions ?? []
    const likeCount = reactions.filter((r) => r.type === "LIKE").length
    const likedByMe = Boolean(
      currentUserId && reactions.some((r) => r.type === "LIKE" && r.userId === currentUserId)
    )
    return { likeCount, likedByMe }
  }

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
              disabled={seeVarPending || !detail?.id}
              onClick={async () => {
                if (!detail?.id || isSeeVarByMe || seeVarPending) return
                setSeeVarPending(true)
                setActionError(null)
                try {
                  const result = await toggleMomentSeeVar(detail.id)
                  if (result.ok) {
                    setDetail((prev) =>
                      prev ? { ...prev, seeVarCount: result.seeVarCount, hasSeeVarByMe: true } : null
                    )
                  } else {
                    setActionError(result.error)
                  }
                } finally {
                  setSeeVarPending(false)
                }
              }}
              className={`font-black italic font-mono text-xs px-4 py-2 rounded transition-colors ${
                isSeeVarByMe
                  ? "bg-primary text-primary-foreground border border-primary shadow-inner cursor-default"
                  : "border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              }`}
              title={isSeeVarByMe ? "이 순간에 공감했습니다" : "이 순간에 공감·추천"}
            >
              {seeVarPending ? <Loader2 className="size-4 animate-spin inline-block" /> : null}
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
              {comments.map((c) => {
                const isOwn = detail?.currentUserId && c.author?.id === detail.currentUserId
                const isEditing = editingCommentId === c.id
                return (
                <div
                  key={c.id}
                  className="p-4 md:p-6 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                      {c.author?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.author.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono">?</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] md:text-xs font-bold text-foreground">
                            {c.author?.name ?? "Anonymous"}
                          </span>
                          <span className="font-mono text-[8px] text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString("ko-KR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                        {currentUserId && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleLike(c.id)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                getLikeState(c).likedByMe
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              aria-label="좋아요"
                            >
                              <Heart
                                className={`size-3.5 ${getLikeState(c).likedByMe ? "fill-current" : ""}`}
                              />
                              {getLikeState(c).likeCount > 0 && (
                                <span>{getLikeState(c).likeCount}</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReport(c.id)}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                              aria-label="신고"
                            >
                              <Flag className="size-3.5" />
                            </button>
                          </>
                        )}
                        {isOwn && !isEditing && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(c.id)
                                setEditingContent(c.content)
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                              aria-label="수정"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="p-1 text-muted-foreground hover:text-destructive rounded"
                              aria-label="삭제"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                          </div>
                      </div>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSaveEdit(c.id)
                              }
                            }}
                            rows={3}
                            className="w-full min-w-0 py-2 px-3 bg-muted border border-border text-xs font-mono rounded focus:border-primary outline-none resize-y"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(c.id)}
                              className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-mono rounded hover:opacity-90"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null)
                                setEditingContent("")
                              }}
                              className="px-3 py-1.5 border border-border text-[10px] font-mono rounded hover:bg-muted"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                      <p className="text-xs md:text-sm mt-1 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {c.content}
                      </p>
                      )}
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
                      {currentUserId && (
                        <div className="mt-2">
                          {replyToCommentId === c.id ? (
                            <div className="space-y-2">
                              <div className="flex gap-2 items-end">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault()
                                      if (e.repeat) return
                                      handleSubmitReply(c.id)
                                    }
                                  }}
                                  placeholder="답글 입력... (Enter 전송)"
                                  rows={2}
                                  className="flex-1 min-w-0 py-2 px-3 bg-muted border border-border text-xs font-mono rounded focus:border-primary outline-none resize-none"
                                />
                                <label
                                  htmlFor={replyFileInputId}
                                  className="shrink-0 h-9 w-9 flex items-center justify-center border border-border rounded text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
                                  title="사진/영상 첨부"
                                >
                                  <ImagePlus className="size-4" />
                                </label>
                                <input
                                  id={replyFileInputId}
                                  type="file"
                                  accept="image/*,video/*"
                                  className="hidden"
                                  onChange={handleReplyFileChange}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSubmitReply(c.id)}
                                  disabled={replyPending || (!replyText.trim() && !replyAttachment)}
                                  className="shrink-0 px-3 py-2 bg-primary text-primary-foreground text-[10px] font-mono rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {replyPending ? <Loader2 className="size-3 animate-spin" /> : null}
                                  전송
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyToCommentId(null)
                                    setReplyText("")
                                    clearReplyAttachment()
                                  }}
                                  className="shrink-0 px-2 py-2 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                                >
                                  취소
                                </button>
                              </div>
                              {replyAttachment && (
                                <div className="flex items-center gap-2">
                                  {replyPreviewUrl &&
                                    (replyAttachment.type.startsWith("image/") ? (
                                      <img
                                        src={replyPreviewUrl}
                                        alt=""
                                        className="w-12 h-12 object-cover rounded border border-border"
                                      />
                                    ) : (
                                      <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-2 py-1">영상</span>
                                    ))}
                                  <span className="text-[10px] font-mono text-muted-foreground truncate flex-1">{replyAttachment.name}</span>
                                  <button type="button" onClick={clearReplyAttachment} className="p-1 text-muted-foreground hover:text-destructive" aria-label="첨부 제거">
                                    <X className="size-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReplyToCommentId(c.id)}
                              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary"
                            >
                              <MessageCircle className="size-3.5" />
                              답글
                            </button>
                          )}
                        </div>
                      )}
                      {flattenReplies(c.replies).length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-border space-y-3">
                          {flattenReplies(c.replies).map((r) => {
                            const replyLike = getLikeState(r)
                            const isOwnReply = currentUserId && r.author?.id === currentUserId
                            const isEditingReply = editingCommentId === r.id
                            const parentName = r.parent?.author?.name ?? "알 수 없음"
                            return (
                              <div key={r.id} className="space-y-1">
                                <div className="flex items-start gap-3">
                                  <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                                    {r.author?.image ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={r.author.image}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground font-mono">?</span>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] text-muted-foreground">
                                        @{parentName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] md:text-xs font-bold">
                                        {r.author?.name ?? "Anonymous"}
                                      </span>
                                      <span className="font-mono text-[8px] text-muted-foreground">
                                        {new Date(r.createdAt).toLocaleString("ko-KR")}
                                      </span>
                                    </div>
                                    {isEditingReply ? (
                                      <div className="mt-2 space-y-2">
                                        <textarea
                                          value={editingContent}
                                          onChange={(e) => setEditingContent(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                              e.preventDefault()
                                              handleSaveEdit(r.id)
                                            }
                                          }}
                                          rows={2}
                                          className="w-full min-w-0 py-2 px-3 bg-muted border border-border text-xs font-mono rounded focus:border-primary outline-none resize-y"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEdit(r.id)}
                                            className="px-2 py-1 bg-primary text-primary-foreground text-[10px] font-mono rounded hover:opacity-90"
                                          >
                                            저장
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(null)
                                              setEditingContent("")
                                            }}
                                            className="px-2 py-1 border border-border text-[10px] font-mono rounded hover:bg-muted"
                                          >
                                            취소
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">
                                      {r.content}
                                    </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {currentUserId && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleLike(r.id)}
                                          className={`p-1 rounded ${replyLike.likedByMe ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                                          aria-label="좋아요"
                                        >
                                          <Heart
                                            className={`size-3 ${replyLike.likedByMe ? "fill-current" : ""}`}
                                          />
                                        </button>
                                        {replyLike.likeCount > 0 && (
                                          <span className="text-[10px] font-mono">{replyLike.likeCount}</span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleReport(r.id)}
                                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                                          aria-label="신고"
                                        >
                                          <Flag className="size-3" />
                                        </button>
                                        {isOwnReply && !isEditingReply && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingCommentId(r.id)
                                                setEditingContent(r.content)
                                              }}
                                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                                              aria-label="수정"
                                            >
                                              <Pencil className="size-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDelete(r.id)}
                                              className="p-1 text-muted-foreground hover:text-destructive rounded"
                                              aria-label="삭제"
                                            >
                                              <Trash2 className="size-3" />
                                            </button>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                {currentUserId && (
                                  <div className="ml-0">
{replyToCommentId === r.id ? (
                                      <div className="space-y-2">
                                        <div className="flex gap-2 items-end">
                                          <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault()
                                                if (e.repeat) return
                                                handleSubmitReply(r.id)
                                              }
                                            }}
                                            placeholder="답글 입력... (Enter 전송)"
                                            rows={2}
                                            className="flex-1 min-w-0 py-2 px-3 bg-muted border border-border text-xs font-mono rounded focus:border-primary outline-none resize-none"
                                          />
                                          <label
                                            htmlFor={replyFileInputId}
                                            className="shrink-0 h-9 w-9 flex items-center justify-center border border-border rounded text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
                                            title="사진/영상 첨부"
                                          >
                                            <ImagePlus className="size-4" />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => handleSubmitReply(r.id)}
                                            disabled={replyPending || (!replyText.trim() && !replyAttachment)}
                                            className="shrink-0 px-3 py-2 bg-primary text-primary-foreground text-[10px] font-mono rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                                          >
                                            {replyPending ? <Loader2 className="size-3 animate-spin" /> : null}
                                            전송
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setReplyToCommentId(null)
                                              setReplyText("")
                                              clearReplyAttachment()
                                            }}
                                            className="shrink-0 px-2 py-2 text-[10px] font-mono text-muted-foreground hover:text-foreground"
                                          >
                                            취소
                                          </button>
                                        </div>
                                        {replyAttachment && (
                                          <div className="flex items-center gap-2">
                                            {replyPreviewUrl &&
                                              (replyAttachment.type.startsWith("image/") ? (
                                                <img
                                                  src={replyPreviewUrl}
                                                  alt=""
                                                  className="w-12 h-12 object-cover rounded border border-border"
                                                />
                                              ) : (
                                                <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-2 py-1">영상</span>
                                              ))}
                                            <span className="text-[10px] font-mono text-muted-foreground truncate flex-1">{replyAttachment.name}</span>
                                            <button type="button" onClick={clearReplyAttachment} className="p-1 text-muted-foreground hover:text-destructive" aria-label="첨부 제거">
                                              <X className="size-4" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setReplyToCommentId(r.id)}
                                        className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary"
                                      >
                                        <MessageCircle className="size-3.5" />
                                        답글
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t border-border shrink-0 space-y-3">
          {actionError && (
            <p className="text-[10px] font-mono text-destructive">{actionError}</p>
          )}
          <div className="flex gap-2 items-center min-h-10">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="QUICK COMMENT... (Enter 전송, Shift+Enter 줄바꿈)"
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
              onClick={handleSubmitComment}
              disabled={submitPending || !commentText.trim()}
              className="shrink-0 h-10 bg-primary text-primary-foreground px-4 font-black italic font-mono text-xs hover:opacity-90 transition-opacity flex items-center gap-2 rounded disabled:opacity-50"
            >
              {submitPending ? <Loader2 className="size-4 animate-spin" /> : null}
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
