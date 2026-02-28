"use client"

import { parseEmbedSegments, type EmbedSegment } from "@/lib/embed-urls"

type Props = {
  text: string
  className?: string
}

function EmbedBlock({ segment }: { segment: EmbedSegment }) {
  if (segment.type === "text") {
    return <>{segment.value}</>
  }
  if (segment.type === "youtube") {
    return (
      <span className="my-2 block w-full max-w-[min(100%,360px)]">
        <iframe
          src={`https://www.youtube.com/embed/${segment.videoId}`}
          title="YouTube"
          className="aspect-video w-full rounded border border-border bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </span>
    )
  }
  if (segment.type === "instagram") {
    const embedPath = segment.isReel
      ? `reel/${segment.shortcode}/embed/`
      : `p/${segment.shortcode}/embed/`
    return (
      <span className="my-2 block w-full max-w-[min(100%,360px)]">
        <iframe
          src={`https://www.instagram.com/${embedPath}`}
          title="Instagram"
          className="min-h-[480px] w-full max-w-[360px] rounded border border-border bg-black"
          frameBorder={0}
          allow="encrypted-media"
        />
      </span>
    )
  }
  return null
}

export function TextWithEmbedPreview({ text, className = "" }: Props) {
  if (!text?.trim()) return null

  const segments = parseEmbedSegments(text)

  return (
    <div className={`leading-relaxed whitespace-pre-wrap ${className}`}>
      {segments.map((segment, i) =>
        segment.type === "text" ? (
          <span key={i}>{segment.value}</span>
        ) : (
          <EmbedBlock key={i} segment={segment} />
        ),
      )}
    </div>
  )
}
