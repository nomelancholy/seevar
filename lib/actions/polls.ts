"use server"

import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type VotePollResult =
  | { ok: true; pollId: string; optionId: string }
  | { ok: false; error: string }

export async function votePoll(pollId: string, optionId: string): Promise<VotePollResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      options: { select: { id: true } },
    },
  })
  if (!poll) return { ok: false, error: "투표를 찾을 수 없습니다." }
  const option = poll.options.find((o) => o.id === optionId)
  if (!option) return { ok: false, error: "유효하지 않은 항목입니다." }

  try {
    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId: user.id } },
      update: { optionId },
      create: { pollId, optionId, userId: user.id },
    })
    return { ok: true, pollId, optionId }
  } catch (e) {
    console.error("votePoll:", e)
    return { ok: false, error: "투표에 실패했습니다." }
  }
}

