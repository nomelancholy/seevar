"use server"

import { promises as fs } from "fs"
import os from "os"
import path from "path"
import { spawn } from "child_process"
import { randomBytes } from "crypto"
import { uploadToSpaces } from "@/lib/spaces"

const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg"

type Rendition = {
  label: "1080p" | "720p" | "480p"
  height: number
  videoBitrate: string
  maxRate: string
  bufSize: string
  audioBitrate: string
  bandwidth: number
}

const RENDITIONS: Rendition[] = [
  { label: "1080p", height: 1080, videoBitrate: "5000k", maxRate: "5350k", bufSize: "7500k", audioBitrate: "192k", bandwidth: 5500000 },
  { label: "720p", height: 720, videoBitrate: "2800k", maxRate: "2996k", bufSize: "4200k", audioBitrate: "128k", bandwidth: 3000000 },
  { label: "480p", height: 480, videoBitrate: "1200k", maxRate: "1284k", bufSize: "1800k", audioBitrate: "96k", bandwidth: 1400000 },
]

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] })
    let stderr = ""
    p.stderr.on("data", (d) => {
      stderr += d.toString()
    })
    p.on("error", reject)
    p.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-1000)}`))
    })
  })
}

function mimeFromFile(filePath: string): string {
  if (filePath.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (filePath.endsWith(".ts")) return "video/mp2t"
  return "application/octet-stream"
}

async function listFilesRecursively(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursively(full)))
    } else if (entry.isFile()) {
      out.push(full)
    }
  }
  return out
}

export async function transcodeAndUploadHlsFromBuffer(params: {
  buffer: Buffer
  originalExt: string
  keyPrefix?: string
}): Promise<{ ok: true; masterUrl: string } | { ok: false; error: string }> {
  const keyPrefix = params.keyPrefix ?? `moments/hls/${randomBytes(8).toString("hex")}`
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "seevar-hls-"))
  const inputPath = path.join(tempRoot, `input.${params.originalExt || "mp4"}`)
  const outDir = path.join(tempRoot, "hls")
  await fs.mkdir(outDir, { recursive: true })

  try {
    await fs.writeFile(inputPath, params.buffer)

    for (const r of RENDITIONS) {
      const variantDir = path.join(outDir, r.label)
      await fs.mkdir(variantDir, { recursive: true })
      const playlist = path.join(variantDir, "index.m3u8")
      const segmentPattern = path.join(variantDir, "seg_%03d.ts")
      const args = [
        "-y",
        "-i",
        inputPath,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "h264",
        "-profile:v",
        "main",
        "-preset",
        "veryfast",
        "-b:v",
        r.videoBitrate,
        "-maxrate",
        r.maxRate,
        "-bufsize",
        r.bufSize,
        "-vf",
        `scale=-2:${r.height}:force_original_aspect_ratio=decrease`,
        "-g",
        "48",
        "-keyint_min",
        "48",
        "-sc_threshold",
        "0",
        "-c:a",
        "aac",
        "-b:a",
        r.audioBitrate,
        "-ac",
        "2",
        "-ar",
        "48000",
        "-hls_time",
        "4",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        segmentPattern,
        playlist,
      ]
      await run(FFMPEG_BIN, args)
    }

    const master = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      ...RENDITIONS.map(
        (r) =>
          `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=1920x${r.height}\n${r.label}/index.m3u8`,
      ),
      "",
    ].join("\n")
    const masterPath = path.join(outDir, "master.m3u8")
    await fs.writeFile(masterPath, master, "utf8")

    let masterUrl: string | null = null
    const files = await listFilesRecursively(outDir)
    for (const absPath of files) {
      const relPath = path.relative(outDir, absPath).replaceAll("\\", "/")
      const key = `${keyPrefix}/${relPath}`
      const body = await fs.readFile(absPath)
      const uploaded = await uploadToSpaces(key, body, mimeFromFile(absPath))
      if (!uploaded.ok) return uploaded
      if (relPath === "master.m3u8") masterUrl = uploaded.url
    }
    if (!masterUrl) return { ok: false, error: "master playlist upload failed" }
    return { ok: true, masterUrl }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "hls transcode failed"
    return { ok: false, error: msg }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined)
  }
}

