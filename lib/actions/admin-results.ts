"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  resolveMatchIdFromIdentifier,
  type MatchIdentifier,
} from "@/lib/resolve-match-identifier"
import { syncRefereeTeamStatCardsForMatchReferee } from "@/lib/referee-stats-sync"
import type { MatchStatus } from "@prisma/client"

export type UpdateMatchResultActionResult = { ok: true } | { ok: false; error: string }
export type ImportBulkMatchResultsResult =
  | { ok: true; updated: number }
  | { ok: false; error: string }

const CARD_DEFAULT = 0

function clampCard(v: unknown): number {
  const n = typeof v === "number" && Number.isInteger(v) ? v : CARD_DEFAULT
  return Math.max(0, n)
}

export async function updateMatchResult(
  matchId: string,
  data: {
    status: MatchStatus
    scoreHome: number | null
    scoreAway: number | null
    firstHalfExtraTime?: number | null
    secondHalfExtraTime?: number | null
    extraFirstHalfExtraTime?: number | null
    extraSecondHalfExtraTime?: number | null
    /** 심판별 카드 수 (matchRefereeId -> 카드) */
    refereeCards?: Record<
      string,
      {
        homeYellowCards?: number
        homeRedCards?: number
        awayYellowCards?: number
        awayRedCards?: number
      }
    >
  }
): Promise<UpdateMatchResultActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  })
  if (!match) return { ok: false, error: "경기를 찾을 수 없습니다." }

  const scoreHome = data.scoreHome != null && Number.isInteger(data.scoreHome) ? data.scoreHome : null
  const scoreAway = data.scoreAway != null && Number.isInteger(data.scoreAway) ? data.scoreAway : null
  if (scoreHome != null && scoreHome < 0) return { ok: false, error: "홈 득점은 0 이상이어야 합니다." }
  if (scoreAway != null && scoreAway < 0) return { ok: false, error: "원정 득점은 0 이상이어야 합니다." }

  try {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: data.status,
        scoreHome: scoreHome ?? undefined,
        scoreAway: scoreAway ?? undefined,
        firstHalfExtraTime: data.firstHalfExtraTime ?? undefined,
        secondHalfExtraTime: data.secondHalfExtraTime ?? undefined,
        extraFirstHalfExtraTime: data.extraFirstHalfExtraTime ?? undefined,
        extraSecondHalfExtraTime: data.extraSecondHalfExtraTime ?? undefined,
      },
    })

    if (data.refereeCards && Object.keys(data.refereeCards).length > 0) {
      for (const [mrId, cards] of Object.entries(data.refereeCards)) {
        const homeY = clampCard(cards.homeYellowCards)
        const homeR = clampCard(cards.homeRedCards)
        const awayY = clampCard(cards.awayYellowCards)
        const awayR = clampCard(cards.awayRedCards)
        await syncRefereeTeamStatCardsForMatchReferee(mrId, {
          homeYellowCards: homeY,
          homeRedCards: homeR,
          awayYellowCards: awayY,
          awayRedCards: awayR,
        })
        await prisma.matchReferee.update({
          where: { id: mrId },
          data: {
            homeYellowCards: homeY,
            homeRedCards: homeR,
            awayYellowCards: awayY,
            awayRedCards: awayR,
          },
        })
      }
    }

    revalidatePath("/admin")
    revalidatePath("/admin/results")
    revalidatePath("/matches")
    revalidatePath("/referees")
    revalidatePath("/teams")
    return { ok: true }
  } catch (e) {
    console.error("updateMatchResult:", e)
    return { ok: false, error: "경기 결과 수정에 실패했습니다." }
  }
}

/** JSON 파일로 경기 결과 일괄 반영. 스코어·상태·심판별 옐로/레드 카드. RefereeTeamStat 카드 합계 자동 반영 */
export async function importBulkMatchResultsFromJson(
  jsonString: string
): Promise<ImportBulkMatchResultsResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }

  let payload: {
    results?: Array<{
      matchId?: string
      matchIdentifier?: MatchIdentifier
      status?: MatchStatus
      scoreHome?: number | null
      scoreAway?: number | null
      refereeCards?: Array<{
        refereeSlug: string
        role: string
        homeYellowCards?: number
        homeRedCards?: number
        awayYellowCards?: number
        awayRedCards?: number
      }>
    }>
  }
  try {
    payload = JSON.parse(jsonString) as typeof payload
  } catch {
    return { ok: false, error: "JSON 형식이 올바르지 않습니다." }
  }
  const results = payload?.results
  if (!Array.isArray(results) || results.length === 0) {
    return { ok: false, error: "JSON에 'results' 배열이 비어 있거나 없습니다." }
  }

  const validStatuses: MatchStatus[] = ["SCHEDULED", "LIVE", "FINISHED", "CANCELLED"]
  let updated = 0

  for (let i = 0; i < results.length; i++) {
    const row = results[i]!
    let matchId: string | null = row.matchId ?? null
    if (!matchId && row.matchIdentifier) {
      const resolved = await resolveMatchIdFromIdentifier(
        prisma,
        row.matchIdentifier as MatchIdentifier,
        `${i + 1}번째`
      )
      if (!resolved.ok) return { ok: false, error: resolved.error }
      matchId = resolved.matchId
    }
    if (!matchId) {
      return { ok: false, error: `${i + 1}번째: matchId 또는 matchIdentifier(year, leagueSlug, roundNumber, homeTeam, awayTeam)를 입력해 주세요.` }
    }

    const status = row.status && validStatuses.includes(row.status) ? row.status : undefined
    const scoreHome =
      row.scoreHome != null && Number.isInteger(row.scoreHome) && row.scoreHome >= 0
        ? row.scoreHome
        : undefined
    const scoreAway =
      row.scoreAway != null && Number.isInteger(row.scoreAway) && row.scoreAway >= 0
        ? row.scoreAway
        : undefined

    try {
      if (status !== undefined || scoreHome !== undefined || scoreAway !== undefined) {
        await prisma.match.update({
          where: { id: matchId },
          data: {
            ...(status !== undefined && { status }),
            ...(scoreHome !== undefined && { scoreHome }),
            ...(scoreAway !== undefined && { scoreAway }),
          },
        })
      }
      let touched = false
      if (status !== undefined || scoreHome !== undefined || scoreAway !== undefined) touched = true

      if (row.refereeCards && Array.isArray(row.refereeCards)) {
        const refereesBySlug = new Map(
          (await prisma.referee.findMany({ select: { id: true, slug: true } })).map((r) => [
            r.slug,
            r.id,
          ])
        )
        for (const cardRow of row.refereeCards) {
          const refereeId = refereesBySlug.get(cardRow.refereeSlug)
          if (!refereeId) continue
          const role = cardRow.role as "MAIN" | "ASSISTANT" | "VAR" | "WAITING"
          if (!["MAIN", "ASSISTANT", "VAR", "WAITING"].includes(role)) continue
          const mr = await prisma.matchReferee.findUnique({
            where: { matchId_refereeId_role: { matchId, refereeId, role } },
            select: { id: true },
          })
          if (!mr) continue
          const homeY = clampCard(cardRow.homeYellowCards)
          const homeR = clampCard(cardRow.homeRedCards)
          const awayY = clampCard(cardRow.awayYellowCards)
          const awayR = clampCard(cardRow.awayRedCards)
          await syncRefereeTeamStatCardsForMatchReferee(mr.id, {
            homeYellowCards: homeY,
            homeRedCards: homeR,
            awayYellowCards: awayY,
            awayRedCards: awayR,
          })
          await prisma.matchReferee.update({
            where: { id: mr.id },
            data: {
              homeYellowCards: homeY,
              homeRedCards: homeR,
              awayYellowCards: awayY,
              awayRedCards: awayR,
            },
          })
          touched = true
        }
      }
      if (touched) updated++
    } catch (e) {
      console.error("importBulkMatchResultsFromJson:", e)
      return { ok: false, error: `${i + 1}번째 경기 결과 반영 중 오류가 발생했습니다.` }
    }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/results")
  revalidatePath("/matches")
  revalidatePath("/referees")
  revalidatePath("/teams")
  return { ok: true, updated }
}
