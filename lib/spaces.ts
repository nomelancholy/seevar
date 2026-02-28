"use server"

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const SPACES_KEY = process.env.SPACES_KEY
const SPACES_SECRET = process.env.SPACES_SECRET
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT
const SPACES_BUCKET = process.env.SPACES_BUCKET

/** S3-compatible client for DigitalOcean Spaces. */
function getSpacesClient(): S3Client | null {
  if (!SPACES_KEY || !SPACES_SECRET || !SPACES_ENDPOINT || !SPACES_BUCKET) return null
  const endpoint = normalizeEndpoint(SPACES_ENDPOINT)
  return new S3Client({
    endpoint,
    region: "us-east-1",
    forcePathStyle: false,
    credentials: {
      accessKeyId: SPACES_KEY,
      secretAccessKey: SPACES_SECRET,
    },
  })
}

/**
 * If endpoint is bucket-style (e.g. https://seevar.sgp1.digitaloceanspaces.com),
 * return region endpoint (https://sgp1.digitaloceanspaces.com) for the client.
 */
function normalizeEndpoint(url: string): string {
  const u = new URL(url)
  const parts = u.hostname.split(".")
  // seevar.sgp1.digitaloceanspaces.com -> sgp1.digitaloceanspaces.com
  if (parts.length === 4 && parts[2] === "digitaloceanspaces") {
    const region = parts[1]
    return `${u.protocol}//${region}.digitaloceanspaces.com`
  }
  return url
}

/**
 * Public base URL for objects (no trailing slash).
 * e.g. https://seevar.sgp1.digitaloceanspaces.com
 */
function getPublicBaseUrl(): string | null {
  if (!SPACES_ENDPOINT || !SPACES_BUCKET) return null
  const u = new URL(SPACES_ENDPOINT)
  const parts = u.hostname.split(".")
  // Region endpoint: sgp1.digitaloceanspaces.com
  if (parts.length === 3 && parts[1] === "digitaloceanspaces" && parts[2] === "com") {
    const region = parts[0]
    return `${u.protocol}//${SPACES_BUCKET}.${region}.digitaloceanspaces.com`
  }
  // Bucket endpoint: seevar.sgp1.digitaloceanspaces.com
  if (parts.length === 4 && parts[2] === "digitaloceanspaces") {
    return SPACES_ENDPOINT.replace(/\/$/, "")
  }
  return null
}

/**
 * Upload a buffer to Spaces and return the public URL.
 * @param key - Object key (e.g. moments/abc.jpg, avatars/userId.png)
 * @param body - File buffer
 * @param contentType - MIME type
 */
export async function uploadToSpaces(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const client = getSpacesClient()
  const baseUrl = getPublicBaseUrl()
  if (!client || !baseUrl) {
    return { ok: false, error: "Spaces 설정이 없습니다. SPACES_KEY, SPACES_SECRET, SPACES_ENDPOINT, SPACES_BUCKET을 확인하세요." }
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: "public-read",
      })
    )
    const url = `${baseUrl}/${key}`
    return { ok: true, url }
  } catch (e) {
    console.error("uploadToSpaces:", e)
    return { ok: false, error: "파일 업로드에 실패했습니다." }
  }
}
