/**
 * Spaces 공개 URL 검증용. "use server" 없음 → API 라우트 등에서 동기 호출 가능.
 */

const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT
const SPACES_BUCKET = process.env.SPACES_BUCKET

/**
 * Public base URL for objects (no trailing slash).
 * e.g. https://seevar.sgp1.digitaloceanspaces.com
 * 관리자 첨부 다운로드 등에서 URL 검증에 사용.
 */
export function getPublicBaseUrl(): string | null {
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
