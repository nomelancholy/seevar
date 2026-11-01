import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, it } from "node:test"

const ADMIN_DIR = join(process.cwd(), "app", "admin")

function findPages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return findPages(path)
    return entry.name === "page.tsx" ? [path] : []
  })
}

describe("관리자 페이지 가드", () => {
  // 레이아웃의 검사는 클라이언트 이동용 요청(RSC)에서 건너뛸 수 있으므로
  // 데이터를 읽는 페이지마다 requireAdmin()을 직접 호출해야 한다 (lib/auth.ts).
  it("app/admin 아래 모든 page.tsx가 requireAdmin()을 호출한다", () => {
    const pages = findPages(ADMIN_DIR)
    assert.ok(pages.length > 0, "관리자 페이지를 찾지 못했습니다")
    const unguarded = pages
      .filter((path) => !/\bawait requireAdmin\(\)/.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path))
    assert.deepEqual(unguarded, [])
  })
})
