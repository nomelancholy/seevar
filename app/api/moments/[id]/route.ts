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
      author: { select: { id: true, name: true } },
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
          round: { include: { league: true } },
        },
      },
      comments: {
        where: { parentId: null, status: "VISIBLE" },
        include: {
          author: true,
          reactions: { select: { type: true, userId: true } },
          replies: {
            where: { status: "VISIBLE" },
            include: {
              author: true,
              reactions: { select: { type: true, userId: true } },
              parent: { select: { id: true, author: { select: { name: true } } } },
              replies: {
                where: { status: "VISIBLE" },
                include: {
                  author: true,
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
      hasSeeVarByMe = true // 작성자는 이미 SEE VAR한 것으로 간주
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

  return NextResponse.json({
    ...moment,
    currentUserId: currentUser?.id ?? null,
    hasSeeVarByMe,
  })
}
