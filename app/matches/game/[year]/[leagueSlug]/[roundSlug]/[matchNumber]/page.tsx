import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { MatchMomentCards } from "@/components/matches/MatchMomentCards"
import { SeeVarButtonWithModal } from "@/components/matches/SeeVarButtonWithModal"
import { getMatchDetailPath, getMatchMomentsPath } from "@/lib/match-url"

type Params = Promise<{ year: string; leagueSlug: string; roundSlug: string; matchNumber: string }>

const ROLE_LABEL: Record<string, string> = {
  REFEREE: "Referee",
  ASSISTANCE: "Assistance",
  WAITING: "Waiting",
  VAR: "VAR",
}

export async function generateMetadata({ params }: { params: Params }) {
  const { year, leagueSlug, roundSlug, matchNumber } = await params
  const match = await resolveMatchBySlug(year, leagueSlug, roundSlug, matchNumber)
  if (!match) return { title: "경기 없음 | See VAR" }
  return {
    title: `${match.homeTeam.name} vs ${match.awayTeam.name} | See VAR`,
  }
}

async function resolveMatchBySlug(
  yearStr: string,
  leagueSlug: string,
  roundSlug: string,
  matchNumberStr: string
) {
  const year = parseInt(yearStr, 10)
  const matchNumber = parseInt(matchNumberStr, 10)
  if (Number.isNaN(year) || Number.isNaN(matchNumber) || matchNumber < 1) return null
  const season = await prisma.season.findUnique({ where: { year } })
  if (!season) return null
  const league = await prisma.league.findFirst({
    where: { seasonId: season.id, slug: leagueSlug },
  })
  if (!league) return null
  const round = await prisma.round.findFirst({
    where: { leagueId: league.id, slug: roundSlug },
  })
  if (!round) return null
  const match = await prisma.match.findUnique({
    where: { roundId_roundOrder: { roundId: round.id, roundOrder: matchNumber } },
    include: {
      homeTeam: true,
      awayTeam: true,
      round: { include: { league: { include: { season: true } } } },
      matchReferees: { include: { referee: true }, orderBy: { role: "asc" } },
      moments: { orderBy: { seeVarCount: "desc" }, take: 5 },
    },
  }).catch((e: { code?: string }) => {
    if (e?.code === "P2021") return null
    throw e
  })
  if (!match) return null
  const fallback = await prisma.match.findUnique({
    where: { roundId_roundOrder: { roundId: round.id, roundOrder: matchNumber } },
    include: {
      homeTeam: true,
      awayTeam: true,
      round: { include: { league: { include: { season: true } } } },
      matchReferees: { include: { referee: true }, orderBy: { role: "asc" } },
    },
  })
  if (!fallback) return null
  return { ...(match ?? fallback), moments: match?.moments ?? [] }
}

export default async function MatchDetailBySlugPage({ params }: { params: Params }) {
  const { year, leagueSlug, roundSlug, matchNumber } = await params
  const match = await resolveMatchBySlug(year, leagueSlug, roundSlug, matchNumber)
  if (!match) notFound()

  const matchPath = getMatchDetailPath(match)
  const momentsPath = getMatchMomentsPath(match)

  const isUpcoming = match.status === "SCHEDULED"
  const isLive = match.status === "LIVE"
  const isFinished = match.status === "FINISHED"
  const dateStr = match.playedAt
    ? new Date(match.playedAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\. /g, "/").replace(".", "")
    : ""
  const timeStr = match.playedAt
    ? new Date(match.playedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : ""

  const refereeByRole = Object.fromEntries(
    match.matchReferees.map((mr) => [mr.role, mr.referee])
  )

  return (
    <main className="py-8 md:py-12">
      <div className="mb-6">
        <Link
          href="/matches"
          className="flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          BACK TO LIST
        </Link>
      </div>

      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-1">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </h1>
          <div className="flex items-center gap-2 font-mono text-[10px] md:text-xs text-muted-foreground">
            {isLive && (
              <span className="bg-red-600 text-white px-2 py-0.5 font-bold uppercase animate-pulse">
                ● LIVE
              </span>
            )}
            {isUpcoming && (
              <span className="bg-muted text-foreground px-2 py-0.5 font-bold uppercase">
                MATCH UPCOMING
              </span>
            )}
            {isFinished && (
              <span className="bg-muted text-foreground px-2 py-0.5 font-bold uppercase">
                FINISHED
              </span>
            )}
            {dateStr && (
              <span className="opacity-70 underline">
                {dateStr} REGULAR SEASON
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="ledger-surface mb-6 md:mb-8 p-4 md:p-8 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-8 md:gap-12">
          <div className="flex flex-col items-center gap-4 md:gap-6">
            <Link
              href="/teams"
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-border flex flex-col items-center justify-center bg-card hover:border-primary transition-colors"
            >
              {match.homeTeam.emblemPath && (
                <img
                  src={match.homeTeam.emblemPath}
                  alt=""
                  className="w-14 h-14 md:w-20 md:h-20"
                />
              )}
              <span className="mt-2 text-[8px] md:text-[10px] font-black italic text-center text-foreground leading-tight px-1">
                {match.homeTeam.name}
              </span>
            </Link>
          </div>

          <div className="text-center flex flex-col items-center">
            {isLive && (
              <>
                <div className="font-mono text-primary text-xs md:text-sm mb-2 uppercase font-bold tracking-widest animate-pulse">
                  ● LIVE NOW
                </div>
                <div className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 flex items-center gap-4 md:gap-6">
                  <span>{match.scoreHome ?? 0}</span>
                  <span className="text-muted-foreground text-3xl md:text-4xl">:</span>
                  <span>{match.scoreAway ?? 0}</span>
                </div>
              </>
            )}
            {isUpcoming && (
              <>
                <div className="font-mono text-muted-foreground text-xs md:text-sm mb-2 uppercase font-bold tracking-widest">
                  KICK OFF {timeStr || "—"}
                </div>
                <div className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4">
                  VS
                </div>
              </>
            )}
            {isFinished && match.scoreHome != null && match.scoreAway != null && (
              <>
                <div className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 flex items-center gap-4 md:gap-6">
                  <span>{match.scoreHome}</span>
                  <span className="text-muted-foreground text-3xl md:text-4xl">:</span>
                  <span>{match.scoreAway}</span>
                </div>
                <p className="font-mono text-sm text-muted-foreground">FT</p>
              </>
            )}

            <div className="w-full h-px bg-border my-6" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 md:gap-y-4 gap-x-4 md:gap-x-8 font-mono text-[10px] md:text-xs text-left mb-6 md:mb-8 w-full max-w-xs">
              {(["REFEREE", "ASSISTANCE", "WAITING", "VAR"] as const).map((role) => {
                const ref = refereeByRole[role]
                const label = ROLE_LABEL[role] ?? role
                const isVar = role === "VAR"
                const isMain = role === "REFEREE"
                return (
                  <div key={role}>
                    <p className="text-muted-foreground mb-1 uppercase tracking-tighter text-[8px] md:text-[10px]">
                      {label}
                    </p>
                    {ref ? (
                      isMain && ref.link ? (
                        <a
                          href={ref.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-bold hover:text-primary transition-colors flex items-center gap-1 ${isVar ? "text-primary" : ""}`}
                        >
                          {ref.name}
                          <ChevronRight className="size-3" />
                        </a>
                      ) : (
                        <p className={`font-bold ${isVar ? "text-primary" : ""}`}>
                          {ref.name}
                        </p>
                      )
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                )
              })}
            </div>

            {isLive && (
              <SeeVarButtonWithModal matchId={match.id} variant="live" />
            )}
            {isUpcoming && (
              <div className="bg-card border border-border px-6 md:px-8 py-3 md:py-4 font-mono text-[10px] md:text-xs text-muted-foreground italic">
                경기 시작 전입니다.
              </div>
            )}
            {isFinished && (
              <SeeVarButtonWithModal matchId={match.id} variant="finished" />
            )}
          </div>

          <div className="flex flex-col items-center gap-4 md:gap-6">
            <Link
              href="/teams"
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-border flex flex-col items-center justify-center bg-card hover:border-primary transition-colors"
            >
              {match.awayTeam.emblemPath && (
                <img
                  src={match.awayTeam.emblemPath}
                  alt=""
                  className="w-14 h-14 md:w-20 md:h-20"
                />
              )}
              <span className="mt-2 text-[8px] md:text-[10px] font-black italic text-center text-foreground leading-tight px-1">
                {match.awayTeam.name}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {(isLive || isFinished) && match.moments.length > 0 && (
        <section className="mb-8 md:mb-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">
              {isLive ? "LIVE HOT MOMENTS" : "MATCH HOT MOMENTS"}
            </h2>
          </div>
          <MatchMomentCards
            moments={match.moments.slice(0, 5)}
            match={{
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              round: match.round,
            }}
            matchId={match.id}
            showRank
            variant="hot"
          />
          <Link
            href={momentsPath}
            className="inline-block mt-4 text-sm font-mono text-primary hover:underline"
          >
            모멘트 게시판 전체 보기 →
          </Link>
        </section>
      )}

      <div className="mb-8 border border-border bg-card/50">
        <div className="flex items-stretch border-b border-border">
          <button
            type="button"
            className="px-4 md:px-6 py-3 font-mono text-xs font-black tracking-widest text-muted-foreground opacity-50 cursor-default"
            disabled
          >
            REFEREE RATING (LOCKED)
          </button>
        </div>
        <div className="p-8 text-center font-mono text-xs text-muted-foreground">
          심판 평가는 경기 종료 후 활성화됩니다.
        </div>
      </div>
    </main>
  )
}
