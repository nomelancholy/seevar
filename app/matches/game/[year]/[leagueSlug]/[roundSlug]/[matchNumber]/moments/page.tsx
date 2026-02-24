import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { MatchMomentCards } from "@/components/matches/MatchMomentCards"
import { getMatchDetailPath } from "@/lib/match-url"

type Params = Promise<{ year: string; leagueSlug: string; roundSlug: string; matchNumber: string }>

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
      moments: { orderBy: { seeVarCount: "desc" } },
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
    },
  })
  if (!fallback) return null
  return { ...(match ?? fallback), moments: match?.moments ?? [] }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { year, leagueSlug, roundSlug, matchNumber } = await params
  const match = await resolveMatchBySlug(year, leagueSlug, roundSlug, matchNumber)
  if (!match) return { title: "경기 없음 | See VAR" }
  return {
    title: `${match.homeTeam.name} vs ${match.awayTeam.name} 모멘트 | See VAR`,
  }
}

export default async function MatchMomentsBySlugPage({ params }: { params: Params }) {
  const { year, leagueSlug, roundSlug, matchNumber } = await params
  const match = await resolveMatchBySlug(year, leagueSlug, roundSlug, matchNumber)
  if (!match) notFound()

  const detailPath = getMatchDetailPath(match)

  return (
    <main className="py-8 md:py-12">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={detailPath}
          className="flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          경기 상세로
        </Link>
        <Link href="/matches" className="text-xs font-mono text-muted-foreground hover:text-foreground">
          경기 목록
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-2">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </h1>
        <p className="text-[10px] md:text-xs font-mono text-muted-foreground">
          {match.round.league.name} · R{match.round.number} · VAR MOMENTS 게시판
        </p>
      </header>

      <p className="text-sm text-muted-foreground mb-6">
        이 경기에서 유저가 생성한 VAR 모멘트입니다. 하나의 경기에 여러 모멘트가 등록될 수 있습니다.
      </p>

      {match.moments.length === 0 ? (
        <div className="ledger-surface p-8 text-center text-muted-foreground font-mono text-sm">
          아직 등록된 모멘트가 없습니다.
        </div>
      ) : (
        <MatchMomentCards
          moments={match.moments}
          match={{
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            round: match.round,
          }}
          matchId={match.id}
          variant="list"
        />
      )}

      <div className="mt-8 pt-6 border-t border-border">
        <Link
          href={detailPath}
          className="text-sm font-mono text-primary hover:underline"
        >
          ← 경기 상세 보기
        </Link>
      </div>
    </main>
  )
}
