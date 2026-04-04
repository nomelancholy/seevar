"use client"

import { useEffect, useRef } from "react"
import Hls from "hls.js"

type Props = {
  src: string
  className?: string
  controls?: boolean
  preload?: "none" | "metadata" | "auto"
  playsInline?: boolean
}

export function AdaptiveVideo({
  src,
  className,
  controls = true,
  preload = "none",
  playsInline = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const isHls = /\.m3u8($|\?)/i.test(src)
    if (!isHls) {
      video.src = src
      return
    }

    // Safari (native HLS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src
      return
    }

    if (!Hls.isSupported()) {
      video.src = src
      return
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
    })
    hls.loadSource(src)
    hls.attachMedia(video)

    return () => {
      hls.destroy()
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      controls={controls}
      className={className}
      preload={preload}
      playsInline={playsInline}
    />
  )
}

