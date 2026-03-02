"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CreateTeamResult = { ok: true; teamId: string } | { ok: false; error: string }
export type UpdateTeamResult = { ok: true } | { ok: false; error: string }
export type DeleteTeamResult = { ok: true } | { ok: false; error: string }
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
  revalidatePath("/admin/teams")
  revalidatePath("/admin/matches")
  revalidatePath("/teams")
  return { ok: true, created, skipped }
}

export async function createTeam(data: {
  name: string
  slug?: string | null
  emblemPath?: string | null
}): Promise<CreateTeamResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const name = data.name?.trim()
  if (!name) return { ok: false, error: "팀 이름을 입력해 주세요." }

  const existing = await prisma.team.findUnique({ where: { name }, select: { id: true } })
  if (existing) return { ok: false, error: "이미 같은 이름의 팀이 있습니다." }

  const baseSlug = data.slug?.trim() || slugFromName(name)
  let slug = baseSlug
  let suffix = 0
  while (true) {
    const existingBySlug = await prisma.team.findFirst({ where: { slug }, select: { id: true } })
    if (!existingBySlug) break
    suffix += 1
    slug = `${baseSlug}_${suffix}`
  }

  try {
    const team = await prisma.team.create({
      data: {
        name,
        slug: slug || null,
        emblemPath: typeof data.emblemPath === "string" ? data.emblemPath.trim() || null : null,
      },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/teams")
    revalidatePath("/admin/matches")
    revalidatePath("/teams")
    return { ok: true, teamId: team.id }
  } catch (e) {
    console.error("createTeam:", e)
    return { ok: false, error: "팀 등록에 실패했습니다." }
  }
}

export async function updateTeam(
  teamId: string,
  data: { name: string; slug?: string | null; emblemPath?: string | null }
): Promise<UpdateTeamResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const name = data.name?.trim()
  if (!name) return { ok: false, error: "팀 이름을 입력해 주세요." }

  const existing = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } })
  if (!existing) return { ok: false, error: "팀을 찾을 수 없습니다." }

  const duplicateName = await prisma.team.findFirst({
    where: { name, id: { not: teamId } },
    select: { id: true },
  })
  if (duplicateName) return { ok: false, error: "이미 같은 이름의 팀이 있습니다." }

  const slug = data.slug !== undefined ? (data.slug?.trim() || null) : undefined
  if (slug !== undefined) {
    const slugVal = slug ?? ""
    if (slugVal) {
      const duplicateSlug = await prisma.team.findFirst({
        where: { slug: slugVal, id: { not: teamId } },
        select: { id: true },
      })
      if (duplicateSlug) return { ok: false, error: "이미 같은 슬러그의 팀이 있습니다." }
    }
  }

  const emblemPath =
    data.emblemPath !== undefined
      ? (typeof data.emblemPath === "string" ? data.emblemPath.trim() || null : null)
      : undefined

  try {
    await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        ...(slug !== undefined && { slug }),
        ...(emblemPath !== undefined && { emblemPath }),
      },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/teams")
    revalidatePath("/admin/matches")
    revalidatePath("/teams")
    return { ok: true }
  } catch (e) {
    console.error("updateTeam:", e)
    return { ok: false, error: "팀 수정에 실패했습니다." }
  }
}

export async function deleteTeam(teamId: string): Promise<DeleteTeamResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          homeMatches: true,
          awayMatches: true,
          users: true,
        },
      },
    },
  })
  if (!team) return { ok: false, error: "팀을 찾을 수 없습니다." }

  const matchCount = team._count.homeMatches + team._count.awayMatches
  if (matchCount > 0) {
    return { ok: false, error: "경기에 배정된 팀은 삭제할 수 없습니다. 먼저 해당 경기를 삭제하거나 팀을 변경해 주세요." }
  }
  if (team._count.users > 0) {
    return { ok: false, error: "응원팀으로 선택한 유저가 있는 팀은 삭제할 수 없습니다." }
  }

  try {
    await prisma.team.delete({ where: { id: teamId } })
    revalidatePath("/admin")
    revalidatePath("/admin/teams")
    revalidatePath("/admin/matches")
    revalidatePath("/teams")
    return { ok: true }
  } catch (e) {
    console.error("deleteTeam:", e)
    return { ok: false, error: "팀 삭제에 실패했습니다." }
  }
}
