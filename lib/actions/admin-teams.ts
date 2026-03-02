"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type ImportBulkTeamsResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string }

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9가-힣_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "team"
}

/**
 * JSON으로 팀 일괄 등록.
 * 형식: { "teams": [ { "name": "인천 유나이티드", "slug": "incheon_united_fc", "emblemPath": null } ] }
 * name 필수. slug·emblemPath 생략 가능. 이미 존재하는 name/slug는 건너뜀.
 */
export async function importBulkTeamsFromJson(jsonText: string): Promise<ImportBulkTeamsResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  let data: { teams?: Array<{ name?: string; slug?: string | null; emblemPath?: string | null }> }
  try {
    data = JSON.parse(jsonText) as typeof data
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }

  const teams = data.teams
  if (!Array.isArray(teams) || teams.length === 0) {
    return { ok: false, error: '"teams" 배열을 입력해 주세요.' }
  }

  let created = 0
  let skipped = 0

  for (let i = 0; i < teams.length; i++) {
    const row = teams[i]
    const name = typeof row.name === "string" ? row.name.trim() : ""
    if (!name) {
      return { ok: false, error: `${i + 1}번째: name을 입력해 주세요.` }
    }

    const existingByName = await prisma.team.findUnique({ where: { name }, select: { id: true } })
    if (existingByName) {
      skipped += 1
      continue
    }

    const baseSlug = row.slug?.trim() || slugFromName(name)
    let slug = baseSlug
    let suffix = 0
    while (true) {
      const existingBySlug = await prisma.team.findFirst({ where: { slug }, select: { id: true } })
      if (!existingBySlug) break
      suffix += 1
      slug = `${baseSlug}_${suffix}`
    }

    try {
      await prisma.team.create({
        data: {
          name,
          slug: slug || null,
          emblemPath: typeof row.emblemPath === "string" ? row.emblemPath.trim() || null : null,
        },
      })
      created += 1
    } catch (e) {
      console.error("importBulkTeams create:", e)
      return { ok: false, error: `${i + 1}번째 팀 등록 실패: ${name}` }
    }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/structure")
  revalidatePath("/admin/matches")
  revalidatePath("/teams")
  return { ok: true, created, skipped }
}
