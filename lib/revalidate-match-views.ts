import { revalidatePath, revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPath } from "@/lib/match-url"

export async function revalidateMatchViews(matchId: string) {
  revalidatePath("/")
  revalidatePath("/matches")
  revalidateTag("archive-rounds")
  revalidateTag("match-details")
  revalidateTag(`match-reviews-${matchId}`)

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      roundOrder: true,
      round: {
        select: {
          slug: true,
          league: {
            select: {
              slug: true,
              season: { select: { year: true } },
            },
          },
        },
      },
    },
  })

  if (!match) return
  revalidatePath(getMatchDetailPath(match))
}
