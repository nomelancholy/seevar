/**
 * 기존 글·닉네임 검수 로직 (스크립트·API 공용).
 */
import { prisma } from "@/lib/prisma"
import { checkProfanity, validateDisplayName } from "@/lib/filters/profanity"

const NICKNAME_THROTTLE_MS = 400

export type Violation = {
  id: string
  preview: string
  reason: string
  link?: string
}

export type AuditReport = {
  at: string
  summary: {
    nicknames: number
    nicknamesRenamed?: number
    comments: number
    reviews: number
    replies: number
    moments: number
  }
  nicknames: Violation[]
  comments: Violation[]
  reviews: Violation[]
  replies: Violation[]
  moments: Violation[]
}

export type RunAuditOptions = {
  /** 위반 댓글·한줄평을 UNDER_REVIEW로 DB 반영 */
  apply?: boolean
  /** 닉네임 검사 생략 (OpenAI 호출 없음) */
  skipNicknames?: boolean
  /** 글 검사 생략 (닉네임만 검사) */
  skipContent?: boolean
  /** 닉네임 위반 시 케이리그화이팅1, 2, 3... 으로 DB 일괄 변경 */
  renameViolatingNicknames?: boolean
}

const RENAME_PREFIX = "케이리그화이팅"

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** DB에 이미 있는 케이리그화이팅{N} 중 최대 N 조회 */
async function getMaxRenamedNicknameIndex(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { name: { startsWith: RENAME_PREFIX } },
    select: { name: true },
  })
  let max = 0
  const suffixRe = new RegExp(`^${RENAME_PREFIX}(\\d+)$`)
  for (const u of users) {
    const m = (u.name ?? "").match(suffixRe)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}

export async function runAuditContent(options: RunAuditOptions = {}): Promise<AuditReport> {
  const {
    apply = false,
    skipNicknames = false,
    skipContent = false,
    renameViolatingNicknames = false,
  } = options

  const report: AuditReport = {
    at: new Date().toISOString(),
    summary: { nicknames: 0, comments: 0, reviews: 0, replies: 0, moments: 0 },
    nicknames: [],
    comments: [],
    reviews: [],
    replies: [],
    moments: [],
  }

  if (!skipNicknames) {
    const users = await prisma.user.findMany({
      where: { name: { not: null } },
      select: { id: true, name: true },
    })
    for (const u of users) {
      const name = u.name ?? ""
      if (!name.trim()) continue
      const result = await validateDisplayName(name)
      await sleep(NICKNAME_THROTTLE_MS)
      if (!result.allowed) {
        report.nicknames.push({ id: u.id, preview: name.slice(0, 80), reason: result.error })
      }
    }
    report.summary.nicknames = report.nicknames.length

    if (renameViolatingNicknames && report.nicknames.length > 0) {
      let nextIndex = (await getMaxRenamedNicknameIndex()) + 1
      for (const v of report.nicknames) {
        const newName = `${RENAME_PREFIX}${nextIndex++}`
        await prisma.user.update({
          where: { id: v.id },
          data: { name: newName },
        })
      }
      report.summary.nicknamesRenamed = report.nicknames.length
    }
  }

  if (!skipContent) {
    const comments = await prisma.comment.findMany({
      select: { id: true, content: true, status: true, moment: { select: { matchId: true } } },
    })
    for (const c of comments) {
      const r = checkProfanity(c.content)
      if (r.isViolated) {
        report.comments.push({
          id: c.id,
          preview: c.content.slice(0, 80).replace(/\n/g, " "),
          reason: r.reason ?? "금칙어 위반",
          link: c.moment?.matchId ? `/matches/${c.moment.matchId}#comment-${c.id}` : undefined,
        })
        if (apply && c.status === "VISIBLE") {
          await prisma.comment.update({
            where: { id: c.id },
            data: { status: "UNDER_REVIEW", filterReason: r.reason ?? undefined },
          })
        }
      }
    }
    report.summary.comments = report.comments.length
  }

  if (!skipContent) {
    const reviews = await prisma.refereeReview.findMany({
      where: { comment: { not: null } },
      select: { id: true, comment: true, status: true, matchId: true },
    })
    for (const r of reviews) {
      const comment = r.comment ?? ""
      const check = checkProfanity(comment)
      if (check.isViolated) {
        report.reviews.push({
          id: r.id,
          preview: comment.slice(0, 80).replace(/\n/g, " "),
          reason: check.reason ?? "금칙어 위반",
          link: `/matches/${r.matchId}#review-${r.id}`,
        })
        if (apply && r.status === "VISIBLE") {
          await prisma.refereeReview.update({
            where: { id: r.id },
            data: { status: "UNDER_REVIEW", filterReason: check.reason ?? undefined },
          })
        }
      }
    }
    report.summary.reviews = report.reviews.length
  }

  if (!skipContent) {
    const replies = await prisma.refereeReviewReply.findMany({
      select: { id: true, content: true, review: { select: { matchId: true } } },
    })
    for (const r of replies) {
      const check = checkProfanity(r.content)
      if (check.isViolated) {
        report.replies.push({
          id: r.id,
          preview: r.content.slice(0, 80).replace(/\n/g, " "),
          reason: check.reason ?? "금칙어 위반",
          link: r.review?.matchId ? `/matches/${r.review.matchId}#reply-${r.id}` : undefined,
        })
      }
    }
    report.summary.replies = report.replies.length
  }

  if (!skipContent) {
    const moments = await prisma.moment.findMany({
      select: { id: true, title: true, description: true, matchId: true },
    })
    for (const m of moments) {
      const texts = [m.title, m.description].filter(Boolean) as string[]
      for (const text of texts) {
        const check = checkProfanity(text)
        if (check.isViolated) {
          report.moments.push({
            id: m.id,
            preview: text.slice(0, 80).replace(/\n/g, " "),
            reason: check.reason ?? "금칙어 위반",
            link: `/matches/${m.matchId}#moment-${m.id}`,
          })
          break
        }
      }
    }
    report.summary.moments = report.moments.length
  }

  return report
}
