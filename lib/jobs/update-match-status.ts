/**
 * playedAt 기준으로 모든 경기의 status를 SCHEDULED / LIVE / FINISHED 로 일괄 갱신.
 * CANCELLED 는 유지(덮어쓰지 않음).
 * 배치/크론에서 주기적으로 호출하여 DB 상태를 동기화할 때 사용.
 *
 * 권장: 크론은 15분마다 돌리되, "경기가 있는 날"의 [가장 이른 경기 3h 전 ~ 가장 늦은 경기 3h 후] 구간에서만
 * 실제 갱신을 수행하려면 isWithinMatchUpdateWindow() 로 먼저 확인 후 updateMatchStatusBatch() 호출.
 */

import type { PrismaClient } from "@prisma/client"
import { LIVE_WINDOW_HOURS, deriveMatchStatus } from "@/lib/utils/match-status"

const WINDOW_BEFORE_HOURS = LIVE_WINDOW_HOURS // 3h 전부터
const WINDOW_AFTER_HOURS = LIVE_WINDOW_HOURS // 3h 후까지
const MS_PER_HOUR = 60 * 60 * 1000

/**
 * "경기가 있는 날"인지, 그리고 현재 시각이 그날의 [가장 이른 경기 3h 전 ~ 가장 늦은 경기 3h 후] 안인지 확인.
 * 경기 일정은 KST 기준 "그날"로 판단.
 * 크론이 15분마다 돌아도 이 구간 밖이면 갱신을 스킵하려고 사용.
 */
export async function isWithinMatchUpdateWindow(
  prisma: PrismaClient,
  asOf: Date = new Date()
): Promise<boolean> {
  // 오늘(KST) 00:00 ~ 23:59:59.999
  const kstDateStr = asOf.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }) // YYYY-MM-DD
  const dayStartKST = new Date(`${kstDateStr}T00:00:00+09:00`)
  const dayEndKST = new Date(`${kstDateStr}T23:59:59.999+09:00`)

  const todayMatches = await prisma.match.findMany({
    where: {
      playedAt: { gte: dayStartKST, lte: dayEndKST },
    },
    select: { playedAt: true },
  })

  if (todayMatches.length === 0) return false

  const times = todayMatches.map((m) => (m.playedAt as Date).getTime())
  const earliest = Math.min(...times)
  const latest = Math.max(...times)
  const windowStart = earliest - WINDOW_BEFORE_HOURS * MS_PER_HOUR
  const windowEnd = latest + WINDOW_AFTER_HOURS * MS_PER_HOUR

  const nowMs = asOf.getTime()
  return nowMs >= windowStart && nowMs <= windowEnd
}

export async function updateMatchStatusBatch(prisma: PrismaClient): Promise<{ updated: number }> {
  const matches = await prisma.match.findMany({
    where: {
      playedAt: { not: null },
      status: { not: "CANCELLED" },
    },
    select: { id: true, playedAt: true, status: true },
  })

  const now = new Date()
  let updated = 0

  for (const m of matches) {
    const derived = deriveMatchStatus(m.playedAt, { asOf: now, storedStatus: m.status })
    if (derived === m.status) continue
    await prisma.match.update({
      where: { id: m.id },
      data: { status: derived },
    })
    updated += 1
  }

  return { updated }
}
