import Image from "next/image"
import { FileText } from "lucide-react"
import { getYouTubeEmbedUrl } from "@/lib/embed-urls"

type Attachment = { name: string; url: string }

type Segment =
  | string
  | { type: "attachment"; index: number }
  | { type: "youtube"; index: number }

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i

function isImageAttachment(a: Attachment): boolean {
  return IMAGE_EXT.test(a.name) || /\.(jpe?g|png|gif|webp)/i.test(a.url)
}

/** [첨부1], [유튜브1] 등 placeholder를 본문 순서대로 치환. 이미지 미리보기, 유튜브 임베드 */
export function NoticeContentWithAttachments({
  content,
  attachments,
  youtubeUrls = [],
}: {
  content: string
  attachments: Attachment[]
  youtubeUrls?: string[]
}) {
  const hasPlaceholders = attachments.length > 0 || youtubeUrls.length > 0

  if (!hasPlaceholders) {
    return (
      <div className="prose prose-invert max-w-none font-mono text-sm md:text-base whitespace-pre-wrap text-foreground/90">
        {content.trim() || "—"}
      </div>
    )
  }

  const re = /\[(첨부|유튜브)(\d+)\]/g
  const matches: { index: number; end: number; type: "attachment" | "youtube"; num: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const num = parseInt(m[2], 10)
    if (m[1] === "첨부" && num >= 1 && num <= attachments.length) {
      matches.push({ index: m.index, end: m.index + m[0].length, type: "attachment", num: num - 1 })
    } else if (m[1] === "유튜브" && num >= 1 && num <= youtubeUrls.length) {
      matches.push({ index: m.index, end: m.index + m[0].length, type: "youtube", num: num - 1 })
    }
  }

  const parts: Segment[] = []
  let lastIndex = 0
  for (const { index, end, type, num } of matches) {
    if (index > lastIndex) {
      parts.push(content.slice(lastIndex, index))
    }
    parts.push(type === "attachment" ? { type: "attachment", index: num } : { type: "youtube", index: num })
    lastIndex = end
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }
  if (parts.length === 0) {
    parts.push(content)
  }

  const usedAttachmentIndices = new Set(
    (parts.filter((p) => p && typeof p === "object" && p.type === "attachment") as { type: "attachment"; index: number }[]).map(
      (p) => p.index
    )
  )
  const usedYoutubeIndices = new Set(
    (parts.filter((p) => p && typeof p === "object" && p.type === "youtube") as { type: "youtube"; index: number }[]).map(
      (p) => p.index
    )
  )
  const unusedAttachments = attachments
    .map((a, i) => ({ a, i }))
    .filter(({ i }) => !usedAttachmentIndices.has(i))
  const unusedYoutubes = youtubeUrls
    .map((url, i) => ({ url, i }))
    .filter(({ i }) => !usedYoutubeIndices.has(i))

  return (
    <div className="prose prose-invert max-w-none font-mono text-sm md:text-base text-foreground/90">
      {parts.map((part, i) => {
        if (typeof part === "string") {
          return (
            <span key={i} className="whitespace-pre-wrap block">
              {part || (i === 0 ? "—" : "")}
            </span>
          )
        }
        if (part.type === "attachment") {
          const att = attachments[part.index]
          if (!att) return null
          return <AttachmentBlock key={i} attachment={att} />
        }
        const url = youtubeUrls[part.index]
        if (!url) return null
        return <YouTubeBlock key={i} url={url} />
      })}
      {(unusedAttachments.length > 0 || unusedYoutubes.length > 0) && (
        <>
          {parts.length > 0 && <span className="whitespace-pre-wrap block mt-4" />}
          {unusedAttachments.map(({ a, i }) => (
            <AttachmentBlock key={`tail-att-${i}`} attachment={a} />
          ))}
          {unusedYoutubes.map(({ url, i }) => (
            <YouTubeBlock key={`tail-yt-${i}`} url={url} />
          ))}
        </>
      )}
    </div>
  )
}

function YouTubeBlock({ url }: { url: string }) {
  const embedUrl = getYouTubeEmbedUrl(url)
  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all text-sm my-3 inline-block"
      >
        {url}
      </a>
    )
  }
  return (
    <span className="block my-4 max-w-2xl aspect-video rounded-lg overflow-hidden border border-border">
      <iframe
        src={embedUrl}
        title="YouTube"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </span>
  )
}

function AttachmentBlock({ attachment }: { attachment: Attachment }) {
  const isImage = isImageAttachment(attachment)
  if (isImage) {
    return (
      <span className="block my-4">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg overflow-hidden border border-border max-w-2xl"
        >
          {/* 외부 스토리지 URL이라 unoptimized 사용 */}
          <Image
            src={attachment.url}
            alt={attachment.name}
            width={800}
            height={500}
            unoptimized
            className="w-full h-auto object-contain"
          />
        </a>
        <span className="text-xs text-muted-foreground mt-1 block">{attachment.name}</span>
      </span>
    )
  }
  return (
    <div className="my-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-sm text-primary hover:underline break-all"
      >
        {attachment.name}
      </a>
    </div>
  )
}
