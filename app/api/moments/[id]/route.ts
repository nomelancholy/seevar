import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = Promise<{ id: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id: momentId } = await params
  const moment = await prisma.moment.findUnique({
    where: { id: momentId },
    include: {
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
          replies: {
            where: { status: "VISIBLE" },
            include: { author: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })
  if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(moment)
}
