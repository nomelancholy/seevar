"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export type OnboardingResult = { ok: true } | { ok: false; error: string }

/**
 * 온보딩 완료: 닉네임(name)과 응원팀(supportingTeamId) 저장 후 즉시 반영.
 */
export async function completeOnboarding(
  name: string,
  supportingTeamId: string
): Promise<OnboardingResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { ok: false, error: "로그인이 필요합니다." }
  }

  const trimmedName = name.trim()
  if (!trimmedName) {
    return { ok: false, error: "닉네임을 입력해 주세요." }
  }
  if (!supportingTeamId) {
    return { ok: false, error: "응원팀을 선택해 주세요." }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: trimmedName,
        supportingTeamId,
        lastTeamChangeAt: new Date(),
      },
    })
    revalidatePath("/", "layout")
    revalidatePath("/onboarding")
    revalidatePath("/my")
    return { ok: true }
  } catch (e) {
    console.error("completeOnboarding:", e)
    return { ok: false, error: "저장에 실패했습니다. 다시 시도해 주세요." }
  }
}
