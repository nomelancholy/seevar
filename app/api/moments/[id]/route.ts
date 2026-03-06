import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = Promise<{ id: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id: momentId } = await params
  const [currentUser, moment] = await Promise.all([
    getCurrentUser(),
    prisma.moment.findUnique({
    where: { id: momentId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          supportingTeamId: true,
          supportingTeam: { select: { id: true, name: true, emblemPath: true } },
        },
      },
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
          round: { include: { league: true } },
        },
      },
      comments: {
        where: {
          parentId: null,
          status: { in: ["VISIBLE", "HIDDEN", "PENDING_REAPPROVAL"] },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              supportingTeam: { select: { emblemPath: true } },
            },
          },
          reactions: { select: { type: true, userId: true } },
          replies: {
            where: { status: { in: ["VISIBLE", "HIDDEN", "PENDING_REAPPROVAL"] } },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  supportingTeam: { select: { emblemPath: true } },
                },
              },
              reactions: { select: { type: true, userId: true } },
              parent: { select: { id: true, author: { select: { name: true } } } },
              replies: {
                where: { status: { in: ["VISIBLE", "HIDDEN", "PENDING_REAPPROVAL"] } },
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                      supportingTeam: { select: { emblemPath: true } },
                    },
                  },
                  reactions: { select: { type: true, userId: true } },
                  parent: { select: { id: true, author: { select: { name: true } } } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  }),
  ])
  if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let hasSeeVarByMe = false
  if (currentUser) {
    if (moment.userId === currentUser.id) {
      hasSeeVarByMe = true // 작성자는 이미 이의 제기한 것으로 간주
    } else {
      const seeVarReaction = await prisma.reaction.findFirst({
        where: {
          momentId: moment.id,
          userId: currentUser.id,
          commentId: null,
          type: "SEE_VAR",
        },
      })
      hasSeeVarByMe = !!seeVarReaction
    }
  }

  const homeTeamId = moment.match.homeTeam.id
  const awayTeamId = moment.match.awayTeam.id

  const seeVarUserTeams = await prisma.reaction.findMany({
    where: {
      momentId: moment.id,
      commentId: null,
      type: "SEE_VAR",
    },
    select: {
      user: {
        select: {
          supportingTeamId: true,
          supportingTeam: { select: { id: true, name: true, emblemPath: true } },
        },
      },
    },
  })

  type AuthorWithTeam = {
    supportingTeamId?: string | null
    supportingTeam?: { id: string; name: string; emblemPath: string | null } | null
  }
  const authorTeamId =
    moment.author && "supportingTeamId" in moment.author
      ? (moment.author as AuthorWithTeam).supportingTeamId ?? null
      : null
  const authorTeam =
    moment.author && "supportingTeam" in moment.author
      ? (moment.author as AuthorWithTeam).supportingTeam ?? null
      : null

  let home = 0
  let away = 0
  const otherTeamsMap = new Map<
    string,
    { teamId: string; name: string; emblemPath: string | null; count: number }
  >()

  for (const { user } of seeVarUserTeams) {
    const tid = user.supportingTeamId
    if (tid === homeTeamId) home++
    else if (tid === awayTeamId) away++
    else if (tid && user.supportingTeam) {
      const t = user.supportingTeam
      const cur = otherTeamsMap.get(t.id)
      if (cur) cur.count++
      else otherTeamsMap.set(t.id, { teamId: t.id, name: t.name, emblemPath: t.emblemPath, count: 1 })
    }
  }
  if (moment.userId) {
    if (authorTeamId === homeTeamId) home++
    else if (authorTeamId === awayTeamId) away++
    else if (authorTeamId && authorTeam) {
      const cur = otherTeamsMap.get(authorTeam.id)
      if (cur) cur.count++
      else
        otherTeamsMap.set(authorTeam.id, {
          teamId: authorTeam.id,
          name: authorTeam.name,
          emblemPath: authorTeam.emblemPath,
          count: 1,
        })
    }
  }

  const seeVarByTeamOtherTeams = [...otherTeamsMap.values()].sort((a, b) => b.count - a.count)
  const other = seeVarByTeamOtherTeams.reduce((s, t) => s + t.count, 0)

  return NextResponse.json({
    ...moment,
    currentUserId: currentUser?.id ?? null,
    hasSeeVarByMe,
    seeVarByTeam: { home, away, other },
    seeVarByTeamOtherTeams,
  })
}
