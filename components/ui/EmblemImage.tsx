"use client"

import Image from "next/image"

type Props = {
  src: string | null | undefined
  alt?: string
  width?: number
  height?: number
  className?: string
  /** 외부 URL일 때 unoptimized (이미 허용된 도메인은 next.config에 등록) */
  unoptimized?: boolean
}

const DEFAULT_SIZE = 24

/**
 * 팀/리그 엠블럼용. next/image로 로드해 최적화·일관된 크기 적용.
 * src가 없으면 아무것도 렌더하지 않음.
 */
export function EmblemImage({
  src,
  alt = "",
  width = DEFAULT_SIZE,
  height = DEFAULT_SIZE,
  className,
  unoptimized = false,
}: Props) {
  if (!src || !src.trim()) return null
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized={unoptimized}
    />
  )
}
