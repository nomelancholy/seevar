"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser, getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type ActionResult = { ok: true } | { ok: false; error: string }
type CopyRosterResult =
  | { ok: true; teams: number; referees: number }
  | { ok: false; error: string }

async function checkAdmin(): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "로그인이 필요합니다." }
  if (!getIsAdmin(user)) return { ok: false, error: "권한이 없습니다." }
  return { ok: true }
}

function revalidateRosterViews() {
  revalidatePath("/admin")
  revalidatePath("/admin/season-rosters")
  revalidatePath("/admin/teams")
  revalidatePath("/admin/referees")
  revalidatePath("/admin/matches")
  revalidatePath("/admin/referee-assignments")
  revalidatePath("/teams")
  revalidatePath("/referees")
}

/** 한 시즌 안에서 팀은 하나의 리그에만 소속되도록 이동한다. */
export async function setTeamSeasonLeague(data: {
  teamId: string
  seasonId: string
  leagueId: string | null
}): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.ok) return auth

  const [team, season] = await Promise.all([
    prisma.team.findUnique({ where: { id: data.teamId }, select: { id: true, name: true } }),
    prisma.season.findUnique({
      where: { id: data.seasonId },
      select: { id: true, year: true, leagues: { select: { id: true, name: true } } },
    }),
  ])
  if (!team) return { ok: false, error: "팀을 찾을 수 없습니다." }
  if (!season) return { ok: false, error: "시즌을 찾을 수 없습니다." }

  const targetLeague = data.leagueId
    ? season.leagues.find((league) => league.id === data.leagueId)
    : null
  if (data.leagueId && !targetLeague) {
    return { ok: false, error: "선택한 리그가 해당 시즌에 속하지 않습니다." }
  }

  const seasonMatches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: data.teamId }, { awayTeamId: data.teamId }],
      round: { league: { seasonId: data.seasonId } },
    },
    select: { round: { select: { leagueId: true, league: { select: { name: true } } } } },
  })
  const playedLeagueIds = new Set(seasonMatches.map((match) => match.round.leagueId))
  if (
    playedLeagueIds.size > 0 &&
    (!data.leagueId || playedLeagueIds.size > 1 || !playedLeagueIds.has(data.leagueId))
  ) {
    const leagueNames = Array.from(
      new Set(seasonMatches.map((match) => match.round.league.name))
    ).join(", ")
    return {
      ok: false,
      error: `${season.year} 시즌 ${leagueNames} 경기가 이미 있어 다른 리그로 이동하거나 미소속 처리할 수 없습니다.`,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const league of season.leagues) {
        await tx.league.update({
          where: { id: league.id },
          data: { teams: { disconnect: { id: data.teamId } } },
        })
      }
      if (data.leagueId) {
        await tx.league.update({
          where: { id: data.leagueId },
          data: { teams: { connect: { id: data.teamId } } },
        })
      }
    })
    revalidateRosterViews()
    return { ok: true }
  } catch (error) {
    console.error("setTeamSeasonLeague:", error)
    return { ok: false, error: "팀의 시즌 소속을 변경하지 못했습니다." }
  }
}

/** 심판 마스터를 삭제하지 않고 해당 시즌의 배정 후보 포함 여부만 변경한다. */
export async function setRefereeSeasonActive(data: {
  refereeId: string
  seasonId: string
  active: boolean
}): Promise<ActionResult> {
  const auth = await checkAdmin()
  if (!auth.ok) return auth

  const [referee, season] = await Promise.all([
    prisma.referee.findUnique({ where: { id: data.refereeId }, select: { id: true, name: true } }),
    prisma.season.findUnique({ where: { id: data.seasonId }, select: { id: true, year: true } }),
  ])
  if (!referee) return { ok: false, error: "심판을 찾을 수 없습니다." }
  if (!season) return { ok: false, error: "시즌을 찾을 수 없습니다." }

  if (!data.active) {
    const assignedMatch = await prisma.matchReferee.findFirst({
      where: {
        refereeId: data.refereeId,
        match: { round: { league: { seasonId: data.seasonId } } },
      },
      select: { id: true },
    })
    if (assignedMatch) {
      return {
        ok: false,
        error: `${season.year} 시즌에 이미 배정된 경기가 있어 활동 명단에서 제외할 수 없습니다.`,
      }
    }
  }

  try {
    if (data.active) {
      await prisma.refereeSeason.upsert({
        where: {
          refereeId_seasonId: { refereeId: data.refereeId, seasonId: data.seasonId },
        },
        update: {},
        create: { refereeId: data.refereeId, seasonId: data.seasonId },
      })
    } else {
      await prisma.refereeSeason.deleteMany({
        where: { refereeId: data.refereeId, seasonId: data.seasonId },
      })
    }
    revalidateRosterViews()
    return { ok: true }
  } catch (error) {
    console.error("setRefereeSeasonActive:", error)
    return { ok: false, error: "심판의 시즌 활동 여부를 변경하지 못했습니다." }
  }
}

/** 승강·신규 심판만 수정하면 되도록 전년도 구성을 새 시즌에 복사한다. */
export async function copySeasonRoster(data: {
  sourceSeasonId: string
  targetSeasonId: string
}): Promise<CopyRosterResult> {
  const auth = await checkAdmin()
  if (!auth.ok) return auth
  if (data.sourceSeasonId === data.targetSeasonId) {
    return { ok: false, error: "같은 시즌으로는 복사할 수 없습니다." }
  }

  const [source, target] = await Promise.all([
    prisma.season.findUnique({
      where: { id: data.sourceSeasonId },
      include: {
        leagues: {
          select: { id: true, slug: true, teams: { select: { id: true } } },
        },
        refereeSeasons: { select: { refereeId: true } },
      },
    }),
    prisma.season.findUnique({
      where: { id: data.targetSeasonId },
      include: {
        leagues: { select: { id: true, slug: true } },
        _count: { select: { leagues: true } },
      },
    }),
  ])
  if (!source || !target) return { ok: false, error: "원본 또는 대상 시즌을 찾을 수 없습니다." }

  const targetMatch = await prisma.match.findFirst({
    where: { round: { league: { seasonId: target.id } } },
    select: { id: true },
  })
  if (targetMatch) {
    return { ok: false, error: `${target.year} 시즌 경기가 이미 있어 명단 전체 복사를 할 수 없습니다.` }
  }

  const targetLeagueBySlug = new Map(target.leagues.map((league) => [league.slug, league.id]))
  const missingLeagues = source.leagues
    .filter((league) => league.teams.length > 0 && !targetLeagueBySlug.has(league.slug))
    .map((league) => league.slug)
  if (missingLeagues.length > 0) {
    return {
      ok: false,
      error: `대상 시즌에 같은 슬러그의 리그가 없습니다: ${missingLeagues.join(", ")}`,
    }
  }

  const sourceTeamCounts = new Map<string, number>()
  for (const league of source.leagues) {
    for (const team of league.teams) {
      sourceTeamCounts.set(team.id, (sourceTeamCounts.get(team.id) ?? 0) + 1)
    }
  }
  const duplicateSourceTeamCount = Array.from(sourceTeamCounts.values()).filter(
    (count) => count > 1
  ).length
  if (duplicateSourceTeamCount > 0) {
    return {
      ok: false,
      error: `원본 시즌에 여러 리그로 중복 연결된 팀이 ${duplicateSourceTeamCount}개 있습니다. 원본 시즌을 먼저 정리해 주세요.`,
    }
  }

  const copiedTeamIds = new Set<string>()
  try {
    await prisma.$transaction(async (tx) => {
      for (const targetLeague of target.leagues) {
        await tx.league.update({
          where: { id: targetLeague.id },
          data: { teams: { set: [] } },
        })
      }

      for (const sourceLeague of source.leagues) {
        const targetLeagueId = targetLeagueBySlug.get(sourceLeague.slug)
        if (!targetLeagueId || sourceLeague.teams.length === 0) continue
        sourceLeague.teams.forEach((team) => copiedTeamIds.add(team.id))
        await tx.league.update({
          where: { id: targetLeagueId },
          data: { teams: { connect: sourceLeague.teams.map((team) => ({ id: team.id })) } },
        })
      }

      await tx.refereeSeason.deleteMany({ where: { seasonId: target.id } })
      if (source.refereeSeasons.length > 0) {
        await tx.refereeSeason.createMany({
          data: source.refereeSeasons.map(({ refereeId }) => ({ refereeId, seasonId: target.id })),
          skipDuplicates: true,
        })
      }
    })

    revalidateRosterViews()
    return {
      ok: true,
      teams: copiedTeamIds.size,
      referees: source.refereeSeasons.length,
    }
  } catch (error) {
    console.error("copySeasonRoster:", error)
    return { ok: false, error: "시즌 명단을 복사하지 못했습니다." }
  }
}
