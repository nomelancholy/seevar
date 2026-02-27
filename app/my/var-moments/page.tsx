import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
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

export const metadata = {
  title: "My VAR Moments | See VAR",
  description: "내가 생성하거나 참여한 논란의 순간들을 확인하세요.",
}

export default async function MyVarMomentsPage() {
  const user = await getCurrentUser()

  const createdByMe =
    user != null
      ? await prisma.moment.findMany({
          where: { userId: user.id },
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
        })
      : []

  const participated =
    user != null
      ? await prisma.moment.findMany({
          where: {
            comments: { some: { userId: user.id } },
          },
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
        })
      : []

  const refereeRatings =
    user != null
      ? await prisma.refereeReview.findMany({
          where: { userId: user.id },
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
        })
      : []

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
      "/my/var-moments"
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
      "/my/var-moments"
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
      "/my/var-moments"
    ),
  }))

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
          BACK
        </Link>
      </div>

      <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
            MY VAR MOMENTS
          </h1>
          <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
            내가 생성하거나 참여한 논란의 순간들을 확인하세요.
          </p>
        </div>
        <div className="text-left md:text-right w-full md:w-auto">
          <span className="text-[8px] md:text-[10px] font-mono text-muted-foreground uppercase">
            Total Created
          </span>
          <p className="text-2xl md:text-3xl font-black italic font-mono text-primary">
            {totalCreated}
          </p>
        </div>
      </header>

      {user ? (
        <MyVarMomentsContent
          createdByMe={createdForClient}
          participated={participatedForClient}
          ratings={ratingsForClient}
        />
      ) : (
        <section className="ledger-surface p-6 md:p-8">
          <p className="text-muted-foreground mb-6">
            로그인이 필요합니다. 내 VAR 모멘트를 보려면 먼저 로그인하세요.
          </p>
          <Link
            href="/login"
            className="inline-block border border-primary bg-primary/10 text-primary px-6 py-2.5 text-[10px] md:text-xs font-black italic font-mono hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            LOGIN
          </Link>
        </section>
      )}
    </main>
  )
}
