import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMatchDetailPathWithBack } from "@/lib/match-url"
import { MyVarMomentsContent } from "@/components/my/MyVarMomentsContent"

type MomentWithMatch = {
  id: string
  description: string | null
  seeVarCount: number
  commentCount: number
  createdAt: Date
  match: {
    roundOrder: number
    playedAt: Date | null
    homeTeam: { name: string }
    awayTeam: { name: string }
    round: {
      number: number
      slug: string
      league: { name: string; slug: string; season: { year: number } }
    }
  }
}

type Params = Promise<{ userId: string }>

/** URL 세그먼트가 DB cuid 형식인지 (기존 링크 호환) */
function isCuidLike(segment: string): boolean {
  return /^c[a-z0-9]{24}$/i.test(segment)
}

function resolveUser(segment: string) {
  return isCuidLike(segment)
    ? prisma.user.findUnique({ where: { id: segment }, select: { id: true, name: true, image: true, createdAt: true, handle: true, supportingTeam: { select: { id: true, name: true, emblemPath: true } } } })
    : prisma.user.findUnique({ where: { handle: segment }, select: { id: true, name: true, image: true, createdAt: true, handle: true, supportingTeam: { select: { id: true, name: true, emblemPath: true } } } })
}

export async function generateMetadata({ params }: { params: Params }) {
  const { userId: segment } = await params
  const user = await resolveUser(segment)
  const displayName = user?.name ?? "회원"
  return {
    title: `${displayName} 회원정보 | SEE VAR`,
    description: `${displayName} 님의 참여 이력을 확인하세요.`,
  }
}

export default async function UserProfilePage({ params }: { params: Params }) {
  const { userId: segment } = await params

  const user = await resolveUser(segment)

  if (!user) notFound()

  const profilePath = user.handle ? `/users/${user.handle}` : `/users/${user.id}`
  const userId = user.id

  const [createdByMe, participated, refereeRatings] = await Promise.all([
    prisma.moment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            round: {
              include: {
                league: { include: { season: true } },
              },
            },
          },
        },
      },
    }),
    prisma.moment.findMany({
      where: { comments: { some: { userId } } },
      orderBy: { createdAt: "desc" },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            round: {
              include: {
                league: { include: { season: true } },
              },
            },
          },
        },
      },
    }),
    prisma.refereeReview.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            round: {
              include: {
                league: { include: { season: true } },
              },
            },
          },
        },
        referee: true,
      },
    }),
  ])

  const totalCreated = createdByMe.length

  const createdForClient = (createdByMe as unknown as MomentWithMatch[]).map((m) => ({
    id: m.id,
    description: m.description,
    seeVarCount: m.seeVarCount,
    commentCount: m.commentCount,
    createdAt: m.createdAt.toISOString(),
    matchTitle: `${m.match.homeTeam.name} vs ${m.match.awayTeam.name}`,
    leagueRound: `${m.match.round.league.name} | ROUND ${m.match.round.number}`,
    matchDetailPath: getMatchDetailPathWithBack(
      {
        roundOrder: m.match.roundOrder,
        round: {
          slug: m.match.round.slug,
          league: {
            slug: m.match.round.league.slug,
            season: { year: m.match.round.league.season.year },
          },
        },
      },
      profilePath
    ),
    isArchived: m.match.playedAt
      ? new Date(m.match.playedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : false,
  }))

  const participatedForClient = (participated as unknown as MomentWithMatch[]).map((m) => ({
    id: m.id,
    description: m.description,
    seeVarCount: m.seeVarCount,
    commentCount: m.commentCount,
    createdAt: m.createdAt.toISOString(),
    matchTitle: `${m.match.homeTeam.name} vs ${m.match.awayTeam.name}`,
    leagueRound: `${m.match.round.league.name} | ROUND ${m.match.round.number}`,
    matchDetailPath: getMatchDetailPathWithBack(
      {
        roundOrder: m.match.roundOrder,
        round: {
          slug: m.match.round.slug,
          league: {
            slug: m.match.round.league.slug,
            season: { year: m.match.round.league.season.year },
          },
        },
      },
      profilePath
    ),
    isArchived: m.match.playedAt
      ? new Date(m.match.playedAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : false,
  }))

  const ratingsForClient = refereeRatings.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    matchTitle: `${r.match.homeTeam.name} vs ${r.match.awayTeam.name}`,
    leagueRound: `${r.match.round.league.name} | ROUND ${r.match.round.number}`,
    refereeName: r.referee.name,
    role: r.role,
    rating: r.rating,
    matchDetailPath: getMatchDetailPathWithBack(
      {
        roundOrder: r.match.roundOrder,
        round: {
          slug: r.match.round.slug,
          league: {
            slug: r.match.round.league.slug,
            season: { year: r.match.round.league.season.year },
          },
        },
      },
      profilePath
    ),
  }))

  const joinDate = new Date(user.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <main className="py-8 md:py-12 max-w-5xl mx-auto">
      <div className="mb-6 md:mb-12">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          뒤로 가기
        </Link>
      </div>

      <header className="mb-8 md:mb-12">
        <div className="flex items-start gap-4 md:gap-6">
          <div className="relative shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-border bg-card overflow-hidden flex items-center justify-center">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl md:text-3xl font-black text-muted-foreground">
                  {(user.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            {user.supportingTeam?.emblemPath && (
              <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 md:w-8 md:h-8 bg-background rounded-full border-2 border-border flex items-center justify-center p-0.5 shadow z-10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.supportingTeam.emblemPath}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-2">
              {user.name ?? "익명"}
            </h1>
            <dl className="font-mono text-xs md:text-sm text-muted-foreground space-y-1">
              <div>
                <span className="text-muted-foreground/80">응원팀 </span>
                <span className="text-foreground font-medium">
                  {user.supportingTeam?.name ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground/80">가입일 </span>
                <span className="text-foreground">{joinDate}</span>
              </div>
            </dl>
          </div>
        </div>
        <div className="mt-6 text-left">
          <span className="text-[8px] md:text-[10px] font-mono text-muted-foreground uppercase">
            Total Created
          </span>
          <p className="text-2xl md:text-3xl font-black italic font-mono text-primary">
            {totalCreated}
          </p>
        </div>
      </header>

      <MyVarMomentsContent
        createdByMe={createdForClient}
        participated={participatedForClient}
        ratings={ratingsForClient}
      />
    </main>
  )
}
