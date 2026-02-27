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
        REFEREE RATING 로딩 중...
      </div>
    ),
  }
)

type Props = {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  matchReferees: { id: string; role: string; referee: { id: string; name: string; slug: string } }[]
  reviews: {
    id: string
    refereeId: string
    userId: string
    rating: number
    comment: string | null
    status?: string
    filterReason?: string | null
    user: { name: string | null }
    fanTeamId: string | null
    fanTeam: { name: string; emblemPath: string | null } | null
    reactions?: { userId: string }[]
  }[]
  currentUserId: string | null
}

export function MatchRefereeRatingSectionDynamic(props: Props) {
  return <MatchRefereeRatingSection {...props} />
}
