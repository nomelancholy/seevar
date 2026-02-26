"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CreateRefereeResult = { ok: true; refereeId: string } | { ok: false; error: string }
export type UpdateRefereeResult = { ok: true } | { ok: false; error: string }
export type DeleteRefereeResult = { ok: true } | { ok: false; error: string }

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "referee"
}

export async function createReferee(data: {
  name: string
  slug?: string | null
  link?: string | null
}): Promise<CreateRefereeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const name = data.name?.trim()
  if (!name) return { ok: false, error: "이름을 입력해 주세요." }

  const baseSlug = data.slug?.trim() || slugFromName(name)
  let slug = baseSlug
  let suffix = 0
  while (true) {
    const existing = await prisma.referee.findUnique({ where: { slug } })
    if (!existing) break
    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }

  try {
    const referee = await prisma.referee.create({
      data: {
        name,
        slug,
        link: data.link?.trim() || null,
      },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/referees")
    revalidatePath("/referees")
    return { ok: true, refereeId: referee.id }
  } catch (e) {
    console.error("createReferee:", e)
    return { ok: false, error: "심판 등록에 실패했습니다." }
  }
}

export async function updateReferee(
  refereeId: string,
  data: { name: string; slug: string; link?: string | null }
): Promise<UpdateRefereeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const name = data.name?.trim()
  const slug = data.slug?.trim()
  if (!name) return { ok: false, error: "이름을 입력해 주세요." }
  if (!slug) return { ok: false, error: "슬러그를 입력해 주세요." }

  const existing = await prisma.referee.findUnique({
    where: { id: refereeId },
    select: { id: true },
  })
  if (!existing) return { ok: false, error: "심판을 찾을 수 없습니다." }

  const duplicate = await prisma.referee.findFirst({
    where: { slug, id: { not: refereeId } },
  })
  if (duplicate) return { ok: false, error: "이미 사용 중인 슬러그입니다." }

  try {
    await prisma.referee.update({
      where: { id: refereeId },
      data: {
        name,
        slug,
        link: data.link?.trim() || null,
      },
    })
    revalidatePath("/admin")
    revalidatePath("/admin/referees")
    revalidatePath("/referees")
    return { ok: true }
  } catch (e) {
    console.error("updateReferee:", e)
    return { ok: false, error: "심판 수정에 실패했습니다." }
  }
}

export async function deleteReferee(refereeId: string): Promise<DeleteRefereeResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const referee = await prisma.referee.findUnique({
    where: { id: refereeId },
    select: { id: true, matchReferees: { take: 1 } },
  })
  if (!referee) return { ok: false, error: "심판을 찾을 수 없습니다." }
  if (referee.matchReferees.length > 0) {
    return { ok: false, error: "배정된 경기가 있는 심판은 삭제할 수 없습니다. 먼저 배정을 해제해 주세요." }
  }

  try {
    await prisma.referee.delete({ where: { id: refereeId } })
    revalidatePath("/admin")
    revalidatePath("/admin/referees")
    revalidatePath("/referees")
    return { ok: true }
  } catch (e) {
    console.error("deleteReferee:", e)
    return { ok: false, error: "심판 삭제에 실패했습니다." }
  }
}
