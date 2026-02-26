/**
 * 같은 시즌·같은 리그에서 "다음 라운드 경기 전날"까지 현재 라운드가 isFocus,
 * 그날이 지나면 다음 라운드가 isFocus가 되도록 일괄 갱신.
 * 배치/크론에서 주기적으로 호출 (경기 상태 배치와 함께 돌리면 됨).
 */

import type { PrismaClient } from "@prisma/client"

const KST = "Asia/Seoul"

/** KST 기준 날짜 문자열 YYYY-MM-DD */
function toKstDateString(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: KST })
}

/** YYYY-MM-DD 문자열에 하루 빼기 */
function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00+09:00")
  d.setDate(d.getDate() - 1)
  return toKstDateString(d)
}

export async function updateRoundFocusBatch(
  prisma: PrismaClient,
  asOf: Date = new Date()
): Promise<{ updated: number }> {
  const todayStr = toKstDateString(asOf)

  const leagues = await prisma.league.findMany({
    select: {
      id: true,
      rounds: {
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          isFocus: true,
          matches: {
            where: { playedAt: { not: null } },
            select: { playedAt: true },
          },
        },
      },
    },
  })

  let updated = 0

  for (const league of leagues) {
    const rounds = league.rounds
    if (rounds.length === 0) continue

    // 각 라운드의 "첫 경기일"(KST 날짜), 없으면 null
    const roundFirstDate: (string | null)[] = rounds.map((r) => {
      const dates = r.matches.map((m) => toKstDateString(m.playedAt as Date))
      if (dates.length === 0) return null
      return dates.sort()[0]
    })

    // 같은 리그 내: "다음 라운드 경기 전날"까지 현재 라운드가 focus, 그날 지나면 다음 라운드로.
    // 라운드 0: today <= (라운드1 첫경기 전날). 라운드 i(i>0): today > (라운드 i 첫경기 전날) && today <= (라운드 i+1 첫경기 전날). 마지막 라운드: today > (자기 첫경기 전날).
    let focusRoundIndex: number | null = null
    for (let i = 0; i < rounds.length; i++) {
      const nextFirst = i + 1 < rounds.length ? roundFirstDate[i + 1] : null
      if (i === 0) {
        if (nextFirst == null) {
          focusRoundIndex = 0
          break
        }
        const focusEnd = prevDay(nextFirst)
        if (todayStr <= focusEnd) {
          focusRoundIndex = 0
          break
        }
        continue
      }
      const first = roundFirstDate[i]
      if (first == null) continue
      const focusStart = prevDay(first)
      if (todayStr <= focusStart) continue
      if (nextFirst == null) {
        focusRoundIndex = i
        break
      }
      const focusEnd = prevDay(nextFirst)
      if (todayStr <= focusEnd) {
        focusRoundIndex = i
        break
      }
    }

    // 해당 라운드만 isFocus=true, 나머지 false
    const focusRoundId = focusRoundIndex != null ? rounds[focusRoundIndex].id : null
    for (const r of rounds) {
      const wantFocus = r.id === focusRoundId
      if (r.isFocus !== wantFocus) {
        await prisma.round.update({
          where: { id: r.id },
          data: { isFocus: wantFocus },
        })
        updated += 1
      }
    }
  }

  return { updated }
}
