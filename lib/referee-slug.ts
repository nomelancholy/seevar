import { romanize } from "@romanize/korean"

/**
 * 한글 이름을 URL용 영문 슬러그로 변환 (Revised Romanization).
 * 동명이인 구분은 호출 쪽에서 baseSlug에 -1, -2 등을 붙여 처리.
 */
export function nameToBaseSlug(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "referee"
  const roman = romanize(trimmed)
  const slug = roman
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "referee"
}

/**
 * 이름으로 고유 슬러그 생성. 이미 사용 중인 slug 목록을 받아 동명이인일 경우 -1, -2 등 구분자 부여.
 */
export function makeUniqueRefereeSlug(
  name: string,
  existingSlugs: Set<string>
): string {
  const base = nameToBaseSlug(name)
  let candidate = base
  let n = 1
  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${n}`
    n += 1
  }
  return candidate
}
