/**
 * 라운드 판정 리포트 자료.
 * 운영자가 라운드 리뷰(영상·카드뉴스)를 만들 때 매번 손으로 모으던 수치를 한 번에 정리한다.
 * 집계 규칙은 사이트에 노출되는 값과 같다 (lib/utils/stats.ts, round-referee-highlights.ts).
 */
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"
import { formatMatchMinuteForDisplay, formatMomentTimeFromPeriod } from "@/lib/utils/format-match-minute"
import {
  buildRoundRefereeHighlights,
  ROLES_FOR_BEST_WORST,
  type RoundRefereeCard,
  type RoundRefereeStat,
} from "@/lib/services/round-referee-highlights"
import { ROUND_MIN_VOTES, formatRating } from "@/lib/utils/stats"
import { DECISION_CATEGORIES, getDecisionCategory } from "@/lib/decision-categories"

const ROLE_LABEL: Record<string, string> = {
  MAIN: "주심",
  VAR: "VAR",
  ASSISTANT: "부심",
  WAITING: "대기심",
}

/** 홈팬·원정팬 평점 차이가 이 값 이상이면 "체감 격차가 큰 판정"으로 뽑는다 */
const PERCEPTION_GAP_THRESHOLD = 1
const TOP_MOMENTS = 5
const TOP_COMMENTS = 5

export type RoundReportComment = {
  id: string
  comment: string
  rating: number
  likeCount: number
  userName: string
  teamName: string | null
  refereeName: string
  role: string
}

export type RoundReportMoment = {
  id: string
  matchLabel: string
  time: string
  /** 판정 유형과 관련 IFAB 조항. 미분류면 null */
  categoryLabel: string | null
  law: string | null
  summary: string | null
  seeVarCount: number
  commentCount: number
  path: string
}

export type RoundReport = {
  title: string
  participation: {
    votes: number
    voters: number
    ratedMatches: number
    totalMatches: number
    moments: number
    seeVarTotal: number
    comments: number
  }
  bestByRole: Partial<Record<string, RoundRefereeCard<RoundReportComment>>>
  worstByRole: Partial<Record<string, RoundRefereeCard<RoundReportComment>>>
  /** 보정 평점 높은 순 */
  referees: RoundRefereeStat[]
  perceptionGaps: Array<RoundRefereeStat & { gap: number }>
  moments: RoundReportMoment[]
  /** 라운드 전체 쟁점 순간의 판정 유형별 건수 (많은 순, 미분류 포함) */
  momentsByCategory: Array<{ label: string; count: number }>
  topComments: RoundReportComment[]
}

function matchLabel(match: { homeTeam: { name: string }; awayTeam: { name: string } }): string {
  return `${match.homeTeam.name} vs ${match.awayTeam.name}`
}

export async function getRoundReport(roundId: string): Promise<RoundReport | null> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      league: { include: { season: true } },
      matches: { select: { id: true } },
    },
  })
  if (!round) return null

  const [reviews, moments] = await Promise.all([
    prisma.refereeReview.findMany({
      where: { status: "VISIBLE", match: { roundId } },
      orderBy: { createdAt: "asc" },
      include: {
        referee: { select: { slug: true, name: true } },
        user: { select: { name: true } },
        fanTeam: { select: { name: true } },
        reactions: { select: { type: true } },
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            round: { include: { league: { include: { season: true } } } },
          },
        },
      },
    }),
    prisma.moment.findMany({
      where: { match: { roundId } },
      orderBy: [{ seeVarCount: "desc" }, { commentCount: "desc" }],
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            round: { include: { league: { include: { season: true } } } },
          },
        },
      },
    }),
  ])

  const { bestByRole, worstByRole, allRoundReferees } = buildRoundRefereeHighlights<RoundReportComment>(
    reviews.map((review) => ({
      refereeId: review.refereeId,
      refereeSlug: review.referee.slug,
      refereeName: review.referee.name,
      role: review.role,
      matchId: review.matchId,
      rating: review.rating,
      fanTeamId: review.fanTeamId,
      homeTeamId: review.match.homeTeamId,
      awayTeamId: review.match.awayTeamId,
      matchForDisplay: {
        homeName: review.match.homeTeam.name,
        awayName: review.match.awayTeam.name,
        matchPath: getMatchDetailPath(review.match),
      },
      feedback: review.comment
        ? {
            id: review.id,
            comment: review.comment,
            rating: review.rating,
            likeCount: review.reactions.filter((reaction) => reaction.type === "LIKE").length,
            userName: review.user.name || "Supporter",
            teamName: review.fanTeam?.name ?? null,
            refereeName: review.referee.name,
            role: review.role,
          }
        : null,
    }))
  )

  // VAR처럼 한 번에 두 심판에게 같은 한줄평이 남는 경우 한 번만 센다
  const seenComments = new Set<string>()
  const comments: RoundReportComment[] = []
  for (const review of reviews) {
    if (!review.comment) continue
    const key = `${review.userId}:${review.matchId}:${review.role}:${review.comment}`
    if (seenComments.has(key)) continue
    seenComments.add(key)
    comments.push({
      id: review.id,
      comment: review.comment,
      rating: review.rating,
      likeCount: review.reactions.filter((reaction) => reaction.type === "LIKE").length,
      userName: review.user.name || "Supporter",
      teamName: review.fanTeam?.name ?? null,
      refereeName: review.referee.name,
      role: review.role,
    })
  }
  const topComments = comments.sort((a, b) => b.likeCount - a.likeCount).slice(0, TOP_COMMENTS)

  const perceptionGaps = allRoundReferees
    .filter((stat) => stat.homeAvg != null && stat.awayAvg != null)
    .map((stat) => ({ ...stat, gap: Math.abs(stat.homeAvg! - stat.awayAvg!) }))
    .filter((stat) => stat.gap >= PERCEPTION_GAP_THRESHOLD)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)

  const categoryCounts = new Map<string, number>()
  for (const moment of moments) {
    const label = getDecisionCategory(moment.category)?.label ?? "미분류"
    categoryCounts.set(label, (categoryCounts.get(label) ?? 0) + 1)
  }
  const categoryOrder: string[] = [...DECISION_CATEGORIES.map((category) => category.label), "미분류"]
  const momentsByCategory = [...categoryCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || categoryOrder.indexOf(a.label) - categoryOrder.indexOf(b.label))

  return {
    title: `${round.league.season.year} ${round.league.name} ${round.number}라운드`,
    participation: {
      votes: reviews.length,
      voters: new Set(reviews.map((review) => review.userId)).size,
      ratedMatches: new Set(reviews.map((review) => review.matchId)).size,
      totalMatches: round.matches.length,
      moments: moments.length,
      seeVarTotal: moments.reduce((sum, moment) => sum + moment.seeVarCount, 0),
      comments: moments.reduce((sum, moment) => sum + moment.commentCount, 0),
    },
    bestByRole,
    worstByRole,
    referees: allRoundReferees,
    perceptionGaps,
    moments: moments.slice(0, TOP_MOMENTS).map((moment) => ({
      id: moment.id,
      matchLabel: matchLabel(moment.match),
      time:
        moment.startPeriod != null && moment.startMinuteInPeriod != null
          ? formatMomentTimeFromPeriod(moment.startPeriod, moment.startMinuteInPeriod)
          : moment.startMinute != null
            ? formatMatchMinuteForDisplay(moment.startMinute)
            : "—",
      categoryLabel: getDecisionCategory(moment.category)?.label ?? null,
      law: getDecisionCategory(moment.category)?.law ?? null,
      summary: (moment.description ?? moment.title)?.replace(/\s+/g, " ").trim() || null,
      seeVarCount: moment.seeVarCount,
      commentCount: moment.commentCount,
      path: `${getMatchDetailPath(moment.match)}?openMoment=${encodeURIComponent(moment.id)}`,
    })),
    momentsByCategory,
    topComments,
  }
}

function refereeLine(stat: RoundRefereeStat): string {
  const match = stat.matchForDisplay ? ` — ${stat.matchForDisplay.homeName} vs ${stat.matchForDisplay.awayName}` : ""
  const sample = stat.lowSample ? " [표본 적음]" : ""
  return (
    `${stat.name} ${stat.avg.toFixed(1)} (${stat.voteCount}명)${sample}${match}` +
    ` | 홈팬 ${formatRating(stat.homeAvg)} · 원정팬 ${formatRating(stat.awayAvg)} · 제3자 ${formatRating(stat.neutralAvg)}`
  )
}

/** 붙여넣기용 텍스트. 영상 대본·카드뉴스 초안의 재료로 쓴다. */
export function formatRoundReportText(report: RoundReport, siteUrl: string): string {
  const lines: string[] = []
  const { participation } = report
  lines.push(`[SEE VAR] ${report.title} 판정 리포트 자료`)
  lines.push("")
  lines.push("■ 참여")
  lines.push(
    `- 심판 평가 ${participation.votes}건 (참여 ${participation.voters}명) · 평가된 경기 ${participation.ratedMatches}/${participation.totalMatches}`
  )
  lines.push(
    `- 쟁점 순간 ${participation.moments}건 · 이의 제기 합계 ${participation.seeVarTotal} · 댓글 ${participation.comments}`
  )

  lines.push("")
  lines.push("■ 역할별 최고점 / 최저점")
  for (const role of ROLES_FOR_BEST_WORST) {
    const best = report.bestByRole[role]
    const worst = report.worstByRole[role]
    if (!best && !worst) continue
    const describe = (card: RoundRefereeCard<RoundReportComment> | undefined) => {
      if (!card) return "없음"
      const names = [card.name, ...(card.peerRefs ?? []).map((peer) => peer.name)].join(", ")
      return `${names} ${card.avg.toFixed(1)} (${card.voteCount}명)${card.lowSample ? " [표본 적음]" : ""}`
    }
    lines.push(`- ${ROLE_LABEL[role] ?? role}: 최고점 ${describe(best)} / 최저점 ${describe(worst)}`)
  }

  for (const role of ROLES_FOR_BEST_WORST) {
    const rows = report.referees.filter((stat) => stat.role === role)
    if (rows.length === 0) continue
    lines.push("")
    lines.push(`■ ${ROLE_LABEL[role] ?? role} 평점 (보정 평점 순)`)
    rows.forEach((stat, index) => lines.push(`${index + 1}. ${refereeLine(stat)}`))
  }

  if (report.perceptionGaps.length > 0) {
    lines.push("")
    lines.push("■ 홈·원정 팬 체감 격차가 큰 판정")
    for (const stat of report.perceptionGaps) {
      const match = stat.matchForDisplay ? ` (${stat.matchForDisplay.homeName} vs ${stat.matchForDisplay.awayName})` : ""
      lines.push(
        `- ${stat.name} ${ROLE_LABEL[stat.role] ?? stat.role}${match}: 홈팬 ${formatRating(stat.homeAvg)} / 원정팬 ${formatRating(stat.awayAvg)} (격차 ${stat.gap.toFixed(1)})`
      )
    }
  }

  if (report.moments.length > 0) {
    lines.push("")
    lines.push(`■ 쟁점 순간 TOP ${report.moments.length}`)
    if (report.momentsByCategory.some((item) => item.label !== "미분류")) {
      lines.push(
        `(판정 유형: ${report.momentsByCategory.map((item) => `${item.label} ${item.count}`).join(" · ")})`
      )
    }
    report.moments.forEach((moment, index) => {
      const category = moment.categoryLabel ? ` [${moment.categoryLabel}]` : ""
      lines.push(
        `${index + 1}. ${moment.matchLabel} ${moment.time}${category} — 이의 제기 ${moment.seeVarCount} · 댓글 ${moment.commentCount}`
      )
      if (moment.summary) lines.push(`   "${moment.summary}"`)
      if (moment.law) lines.push(`   관련 규정: IFAB 경기규칙 ${moment.law}`)
      lines.push(`   ${siteUrl}${moment.path}`)
    })
  }

  if (report.topComments.length > 0) {
    lines.push("")
    lines.push("■ 공감 많은 한줄평")
    for (const comment of report.topComments) {
      const author = comment.teamName ? `${comment.userName}(${comment.teamName})` : comment.userName
      lines.push(
        `- ★${comment.rating} "${comment.comment.replace(/\s+/g, " ").trim()}" — ${author} · 좋아요 ${comment.likeCount} → ${comment.refereeName}(${ROLE_LABEL[comment.role] ?? comment.role})`
      )
    }
  }

  lines.push("")
  lines.push(
    `※ 숨김 처리된 평가는 제외. 순위는 평가 수를 반영한 보정 평점 기준이며, 평가 ${ROUND_MIN_VOTES}명 미만은 [표본 적음]으로 표시.`
  )
  return lines.join("\n")
}
