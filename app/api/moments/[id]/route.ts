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
      author: { select: { id: true, name: true, supportingTeamId: true } },
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
    select: { user: { select: { supportingTeamId: true } } },
  })

  const authorTeamId = moment.author && "supportingTeamId" in moment.author
    ? (moment.author as { supportingTeamId: string | null }).supportingTeamId ?? null
    : null

  let home = 0
  let away = 0
  let other = 0
  for (const { user } of seeVarUserTeams) {
    const tid = user.supportingTeamId
    if (tid === homeTeamId) home++
    else if (tid === awayTeamId) away++
    else other++
  }
  if (moment.userId) {
    if (authorTeamId === homeTeamId) home++
    else if (authorTeamId === awayTeamId) away++
    else other++
  }

  return NextResponse.json({
    ...moment,
    currentUserId: currentUser?.id ?? null,
    hasSeeVarByMe,
    seeVarByTeam: { home, away, other },
  })
}
