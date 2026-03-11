"use client"

import dynamic from "next/dynamic"

const MatchRefereeRatingSection = dynamic(
  () =>
    import("@/components/matches/MatchRefereeRatingSection").then((mod) => ({
      default: mod.MatchRefereeRatingSection,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mb-8 border border-border bg-card/50 p-8 font-mono text-xs text-muted-foreground text-center">
        심판 평가 로딩 중...
      </div>
    ),
  }
)

type Props = {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  initialRefereeSlug?: string | null
  matchReferees: { id: string; role: string; referee: { id: string; name: string; slug: string } }[]
  reviews: {
    id: string
    refereeId: string
    userId: string
    rating: number
    comment: string | null
    status?: string
    filterReason?: string | null
    createdAt: Date | string
    updatedAt?: Date | string
    user: { id?: string; name: string | null; image: string | null; handle?: string | null }
    fanTeamId: string | null
    fanTeam: { name: string; emblemPath: string | null } | null
    reactions?: { userId: string }[]
    replies?: {
      id: string
      userId: string
      content: string
      createdAt: Date | string
      user: {
        id?: string
        name: string | null
        image?: string | null
        handle?: string | null
        supportingTeam?: { name: string; emblemPath: string | null } | null
      }
      reactions?: { userId: string }[]
    }[]
  }[]
  currentUserId: string | null
  currentUserName?: string | null
  currentUserImage?: string | null
  currentUserSupportingTeam?: { name: string; emblemPath: string | null } | null
}

export function MatchRefereeRatingSectionDynamic({
  initialRefereeSlug,
  ...props
}: Props) {
  return <MatchRefereeRatingSection initialRefereeSlug={initialRefereeSlug} {...props} />
}
