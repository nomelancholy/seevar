/**
 * 한줄평·모멘트 댓글 텍스트에서 YouTube/Instagram URL 추출 후 미리보기용 정보 반환
 */

export type EmbedSegment =
  | { type: "text"; value: string }
  | { type: "youtube"; url: string; videoId: string }
  | { type: "instagram"; url: string; shortcode: string; isReel: boolean }

type MatchResult = { index: number; end: number; segment: EmbedSegment }

// 쿼리(?si=xxx 등)·프래그먼트까지 매칭해 화면에 안 나오게 함
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\?[^\s]*)?/g
const YOUTUBE_SHORTS_REGEX =
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?[^\s]*)?/g
const INSTAGRAM_REGEX =
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)\/?/g

function getMatches(text: string): MatchResult[] {
  const matches: MatchResult[] = []

  let m: RegExpExecArray | null
  YOUTUBE_REGEX.lastIndex = 0
  while ((m = YOUTUBE_REGEX.exec(text)) !== null) {
    const url = m[0].startsWith("http") ? m[0] : `https://${m[0]}`
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      segment: { type: "youtube", url, videoId: m[1] },
    })
  }

  YOUTUBE_SHORTS_REGEX.lastIndex = 0
  while ((m = YOUTUBE_SHORTS_REGEX.exec(text)) !== null) {
    const url = m[0].startsWith("http") ? m[0] : `https://${m[0]}`
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      segment: { type: "youtube", url, videoId: m[1] },
    })
  }

  INSTAGRAM_REGEX.lastIndex = 0
  while ((m = INSTAGRAM_REGEX.exec(text)) !== null) {
    const isReel = m[0].includes("/reel/")
    const url = m[0].startsWith("http")
      ? m[0]
      : `https://www.instagram.com/${isReel ? "reel" : "p"}/${m[1]}/`
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      segment: { type: "instagram", url, shortcode: m[1], isReel },
    })
  }

  const sorted = matches.sort((a, b) => a.index - b.index)
  const merged: MatchResult[] = []
  let lastEnd = -1
  for (const m of sorted) {
    if (m.index >= lastEnd) {
      merged.push(m)
      lastEnd = m.end
    }
  }
  return merged
}

export function parseEmbedSegments(text: string): EmbedSegment[] {
  if (!text?.trim()) return []

  const matches = getMatches(text)
  if (matches.length === 0) return [{ type: "text", value: text }]

  const segments: EmbedSegment[] = []
  let lastIndex = 0

  for (const { index, end, segment } of matches) {
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) })
    }
    segments.push(segment)
    lastIndex = end
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) })
  }

  return segments
}

export function hasEmbedLinks(text: string): boolean {
  if (!text?.trim()) return false
  YOUTUBE_REGEX.lastIndex = 0
  YOUTUBE_SHORTS_REGEX.lastIndex = 0
  INSTAGRAM_REGEX.lastIndex = 0
  return (
    YOUTUBE_REGEX.test(text) ||
    YOUTUBE_SHORTS_REGEX.test(text) ||
    INSTAGRAM_REGEX.test(text)
  )
}
