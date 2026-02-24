import { notFound } from "next/navigation"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"

type Props = { params: Promise<{ id: string }> }

export default async function MatchDetailByIdPage({ params }: Props) {
  const { id } = await params
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      round: { include: { league: { include: { season: true } } } },
    },
  }).catch((e: { code?: string }) => {
    if (e?.code === "P2021") return null
    throw e
  })
  if (!match) notFound()
  redirect(getMatchDetailPath(match as unknown as Parameters<typeof getMatchDetailPath>[0]))
}
