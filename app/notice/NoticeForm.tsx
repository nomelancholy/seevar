"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Paperclip, X, Loader2, Youtube } from "lucide-react"
import { createNotice } from "@/lib/actions/notices"
import { uploadNoticeAttachment } from "@/lib/actions/upload-notice-attachment"
import type { NoticeAttachment } from "@/lib/actions/notices"

type Props = {
  noticeId?: string
  noticeNumber?: number
  initialTitle?: string
  initialContent?: string
  initialAllowComments?: boolean
  initialIsPinned?: boolean
  initialAttachments?: NoticeAttachment[]
  initialYoutubeUrls?: string[]
  mode?: "create" | "edit"
}

export function NoticeForm({
  noticeId,
  noticeNumber,
  initialTitle = "",
  initialContent = "",
  initialAllowComments = true,
  initialIsPinned = false,
  initialAttachments = [],
  initialYoutubeUrls = [],
  mode = "create",
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [allowComments, setAllowComments] = useState(initialAllowComments)
  const [isPinned, setIsPinned] = useState(initialIsPinned)
  const [attachments, setAttachments] = useState<NoticeAttachment[]>(initialAttachments)
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(initialYoutubeUrls)
  const [youtubeInput, setYoutubeInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadNoticeAttachment(formData)
      if (result.ok) {
        setAttachments((prev) => [...prev, { name: result.name, url: result.url }])
      } else {
        setUploadError(result.error)
      }
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const addYoutubeUrl = () => {
    const trimmed = youtubeInput.trim()
    if (!trimmed) return
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    if (/youtube\.com|youtu\.be/i.test(url)) {
      setYoutubeUrls((prev) => [...prev, url])
      setYoutubeInput("")
    }
  }

  const removeYoutubeUrl = (index: number) => {
    setYoutubeUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result =
      mode === "create"
        ? await createNotice({ title, content, allowComments, isPinned, attachments, youtubeUrls })
        : await (async () => {
            const { updateNotice } = await import("@/lib/actions/notices")
            return updateNotice(noticeId!, { title, content, allowComments, isPinned, attachments, youtubeUrls })
          })()
    setPending(false)
    if (result.ok) {
      if (mode === "create" && "number" in result) router.push(`/notice/${result.number}`)
      else if (mode === "edit" && noticeNumber != null) router.push(`/notice/${noticeNumber}`)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ledger-surface p-4 md:p-8 border border-border space-y-6">
      <div>
        <label className="block font-mono text-xs text-muted-foreground uppercase mb-2">
          제목
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 200))}
          required
          className="w-full bg-background border border-border px-3 py-2 font-mono text-sm focus:border-primary outline-none"
          placeholder="공지 제목"
        />
      </div>
      <div>
        <label className="block font-mono text-xs text-muted-foreground uppercase mb-2">
          내용
        </label>
        <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
          글 안에 <span className="font-mono text-foreground/80">[첨부1]</span>, <span className="font-mono text-foreground/80">[유튜브1]</span> … 를 넣으면 해당 순서의 첨부·유튜브가 그 자리에 들어갑니다. 넣지 않으면 본문 아래에 표시됩니다.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="w-full bg-background border border-border p-3 font-mono text-sm focus:border-primary outline-none resize-y"
          placeholder="공지 내용"
        />
      </div>
      <div>
        <label className="block font-mono text-xs text-muted-foreground uppercase mb-2">
          첨부파일
        </label>
        <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
          이미지, PDF, 문서, 텍스트 (파일당 20MB 이하)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
          {uploading ? "업로드 중…" : "파일 추가"}
        </button>
        {uploadError && <p className="mt-1 text-destructive text-xs font-mono">{uploadError}</p>}
        {attachments.length > 0 && (
          <ul className="mt-3 space-y-2">
            {attachments.map((a, i) => (
              <li key={`${a.url}-${i}`} className="flex items-center gap-2 font-mono text-xs">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px] md:max-w-[320px]">
                  {a.name}
                </a>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  aria-label="첨부 제거"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="block font-mono text-xs text-muted-foreground uppercase mb-2">
          유튜브 링크
        </label>
        <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
          아래에서 순서대로 추가. 본문에 <span className="font-mono text-foreground/80">[유튜브1]</span>, <span className="font-mono text-foreground/80">[유튜브2]</span> … 로 삽입
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="url"
            value={youtubeInput}
            onChange={(e) => setYoutubeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addYoutubeUrl())}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 min-w-[200px] bg-background border border-border px-3 py-2 font-mono text-sm focus:border-primary outline-none"
          />
          <button
            type="button"
            onClick={addYoutubeUrl}
            className="border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            추가
          </button>
        </div>
        {youtubeUrls.length > 0 && (
          <ul className="mt-3 space-y-2">
            {youtubeUrls.map((url, i) => (
              <li key={`${url}-${i}`} className="flex items-center gap-2 font-mono text-xs">
                <Youtube className="size-3.5 shrink-0 text-muted-foreground" />
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[280px] md:max-w-[400px]">
                  [유튜브{i + 1}] {url}
                </a>
                <button
                  type="button"
                  onClick={() => removeYoutubeUrl(i)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  aria-label="유튜브 링크 제거"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-mono text-xs text-muted-foreground uppercase">옵션</label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-border"
            />
            <span>상단 고정</span>
          </label>
          <label className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <input
              type="checkbox"
              id="allowComments"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className="rounded border-border"
            />
            <span>댓글 허용</span>
          </label>
        </div>
      </div>
      {error && <p className="text-destructive text-sm font-mono">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="border border-primary bg-primary text-primary-foreground px-6 py-2 font-mono text-xs font-bold uppercase hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "저장 중…" : mode === "create" ? "등록" : "수정"}
      </button>
    </form>
  )
}
