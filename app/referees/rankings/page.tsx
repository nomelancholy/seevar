import Link from "next/link"
import { unstable_cache } from "next/cache"
import { ChevronLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { KakaoAdFit } from "@/components/ads/KakaoAdFit"
import { buildRefereeRankings, type RefereeRankingRow } from "@/lib/services/referee-rankings"
import { buildPageMetadata } from "@/lib/site"
import { SEASON_MIN_VOTES, formatRating } from "@/lib/utils/stats"
import type { RefereeRole } from "@prisma/client"

export const metadata = buildPageMetadata({
  title: "시즌 심판 랭킹 | SEE VAR",
  description:
    "팬 평가로 본 K리그 시즌 심판 랭킹. 평가 수를 반영한 보정 평점과 홈·원정·제3자 팬 시점별 평점을 함께 제공합니다.",
  path: "/referees/rankings",
})

type Props = {
  searchParams: Promise<{ year?: string; league?: string; role?: string }>
}

const ROLE_TABS: Array<{ value: RefereeRole; label: string }> = [
  { value: "MAIN", label: "주심" },
  { value: "ASSISTANT", label: "부심" },
  { value: "WAITING", label: "대기심" },
  { value: "VAR", label: "VAR" },
]

function getRankingsCached(year: number, leagueSlug: string | null, role: RefereeRole) {
  return unstable_cache(
    async () => {
      const reviews = await prisma.refereeReview.findMany({
        where: {
          status: "VISIBLE",
          role,
          match: {
            round: {
              league: {
                season: { year },
                ...(leagueSlug ? { slug: leagueSlug } : {}),
              },
            },
          },
        },
        select: {
          rating: true,
          fanTeamId: true,
          matchId: true,
          referee: { select: { id: true, slug: true, name: true } },
          match: { select: { homeTeamId: true, awayTeamId: true } },
        },
      })
      return buildRefereeRankings(
        reviews.map((review) => ({
          refereeId: review.referee.id,
          refereeSlug: review.referee.slug,
          refereeName: review.referee.name,
          matchId: review.matchId,
          rating: review.rating,
          fanTeamId: review.fanTeamId,
          homeTeamId: review.match.homeTeamId,
          awayTeamId: review.match.awayTeamId,
        }))
      )
    },
    ["referee-rankings", String(year), leagueSlug ?? "all", role],
    { revalidate: 300, tags: ["referee-rankings"] }
  )()
}

function FilterChips({
  label,
  options,
  current,
  hrefFor,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  current: string
  hrefFor: (value: string) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-10 shrink-0 font-mono text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {options.map((option) => (
        <Link
          key={option.value}
          href={hrefFor(option.value)}
          aria-current={option.value === current ? "true" : undefined}
          className={`border px-3 py-1.5 font-mono text-xs md:text-sm font-bold transition-colors ${
            option.value === current
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}

function RankingTable({
  rows,
  backPath,
}: {
  rows: RefereeRankingRow[]
  backPath: string
}) {
  return (
    <div className="ledger-surface overflow-x-auto">
      <table className="w-full font-mono text-xs md:text-sm">
        <thead>
          <tr className="border-b border-border bg-card/50 text-left text-muted-foreground uppercase tracking-wider">
            <th className="p-3 md:p-4 font-bold w-12 md:w-16">순위</th>
            <th className="p-3 md:p-4 font-bold">심판</th>
            <th className="p-3 md:p-4 font-bold text-right whitespace-nowrap">보정 평점</th>
            <th className="p-3 md:p-4 font-bold text-right">평균</th>
            <th className="p-3 md:p-4 font-bold text-right">평가</th>
            <th className="hidden md:table-cell p-4 font-bold text-right">경기</th>
            <th className="hidden lg:table-cell p-4 font-bold text-right">홈팀 팬</th>
            <th className="hidden lg:table-cell p-4 font-bold text-right">원정팀 팬</th>
            <th className="hidden lg:table-cell p-4 font-bold text-right">제3자 팬</th>
            <th className="hidden md:table-cell p-4 font-bold text-right">균형</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row) => (
            <tr key={row.refereeId} className="hover:bg-white/[0.02]">
              <td className="p-3 md:p-4 font-black italic text-base md:text-lg tabular-nums">
                {row.rank ?? "—"}
              </td>
              <td className="p-3 md:p-4">
                <Link
                  href={`/referees/${row.slug}?back=${encodeURIComponent(backPath)}`}
                  className="font-bold text-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  {row.name}
                </Link>
              </td>
              <td className="p-3 md:p-4 text-right font-black tabular-nums text-primary">
                {row.rank != null ? row.adjusted.toFixed(2) : "—"}
              </td>
              <td className="p-3 md:p-4 text-right font-bold tabular-nums">{row.average.toFixed(1)}</td>
              <td className="p-3 md:p-4 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                {row.voteCount.toLocaleString()}건
              </td>
              <td className="hidden md:table-cell p-4 text-right tabular-nums text-muted-foreground">
                {row.ratedMatchCount}
              </td>
              <td className="hidden lg:table-cell p-4 text-right tabular-nums text-muted-foreground">
                {formatRating(row.homeAvg)}
              </td>
              <td className="hidden lg:table-cell p-4 text-right tabular-nums text-muted-foreground">
                {formatRating(row.awayAvg)}
              </td>
              <td className="hidden lg:table-cell p-4 text-right tabular-nums text-muted-foreground">
                {formatRating(row.neutralAvg)}
              </td>
              <td className="hidden md:table-cell p-4 text-right tabular-nums">
                {formatRating(row.balanced)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function RefereeRankingsPage({ searchParams }: Props) {
  const { year: yearParam, league: leagueParam, role: roleParam } = await searchParams

  const seasons = await prisma.season.findMany({
    where: { leagues: { some: {} } },
    orderBy: { year: "desc" },
    select: { year: true, leagues: { orderBy: { slug: "asc" }, select: { slug: true, name: true } } },
  })

  const requestedYear = yearParam ? parseInt(yearParam, 10) : NaN
  const season = seasons.find((item) => item.year === requestedYear) ?? seasons[0] ?? null
  const leagues = season?.leagues ?? []
  const leagueSlug = leagues.some((league) => league.slug === leagueParam) ? leagueParam! : null
  const role = ROLE_TABS.find((tab) => tab.value === roleParam)?.value ?? "MAIN"

  const hrefFor = (next: { year?: number; league?: string | null; role?: RefereeRole }) => {
    const params = new URLSearchParams()
    const nextYear = next.year ?? season?.year
    // 연도를 바꾸면 그 시즌에 없는 리그일 수 있으므로 리그 필터는 초기화
    const nextLeague = next.year != null ? null : next.league !== undefined ? next.league : leagueSlug
    if (nextYear != null) params.set("year", String(nextYear))
    if (nextLeague) params.set("league", nextLeague)
    params.set("role", next.role ?? role)
    return `/referees/rankings?${params.toString()}`
  }

  const rankings = season ? await getRankingsCached(season.year, leagueSlug, role) : null
  const backPath = hrefFor({})
  const roleLabel = ROLE_TABS.find((tab) => tab.value === role)?.label ?? role

  return (
    <>
      <KakaoAdFit />
      <main className="py-8 md:py-12">
        <div className="mb-6">
          <Link
            href="/referees"
            className="inline-flex items-center gap-1 font-mono text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            심판 정보
          </Link>
        </div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
            시즌 심판 랭킹
          </h1>
          <p className="font-mono text-[10px] md:text-sm text-muted-foreground max-w-2xl">
            한 시즌 동안 팬들이 남긴 평가를 모아 본 심판 순위입니다. 한두 명의 평가로 순위가 뒤바뀌지
            않도록 평가 수를 반영해 보정합니다.
          </p>
        </header>

        {!season ? (
          <p className="font-mono text-muted-foreground">등록된 시즌이 없습니다.</p>
        ) : (
          <>
            <div className="ledger-surface p-3 md:p-4 mb-6 md:mb-8 space-y-3">
              <FilterChips
                label="연도"
                current={String(season.year)}
                options={seasons.map((item) => ({ value: String(item.year), label: `${item.year}` }))}
                hrefFor={(value) => hrefFor({ year: parseInt(value, 10) })}
              />
              <FilterChips
                label="리그"
                current={leagueSlug ?? "all"}
                options={[
                  { value: "all", label: "전체" },
                  ...leagues.map((league) => ({ value: league.slug, label: league.name })),
                ]}
                hrefFor={(value) => hrefFor({ league: value === "all" ? null : value })}
              />
              <FilterChips
                label="역할"
                current={role}
                options={ROLE_TABS}
                hrefFor={(value) => hrefFor({ role: value as RefereeRole })}
              />
            </div>

            {rankings && rankings.ranked.length > 0 ? (
              <RankingTable rows={rankings.ranked} backPath={backPath} />
            ) : (
              <div className="ledger-surface p-8 text-center font-mono text-sm text-muted-foreground">
                아직 순위를 매길 만큼 평가가 모이지 않았습니다. ({roleLabel} 기준 평가 {SEASON_MIN_VOTES}건
                이상부터 순위에 포함됩니다.)
              </div>
            )}

            {rankings && (
              <div className="mt-4 space-y-1 font-mono text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                <p>
                  · 보정 평점: 평가 수가 적을수록 이 범위의 전체 평균({rankings.priorMean.toFixed(2)}점) 쪽으로
                  당겨 계산한 순위용 점수입니다. 평가가 쌓일수록 실제 평균에 가까워집니다.
                </p>
                <p>
                  · 균형: 홈팀·원정팀·제3자 팬 평균을 같은 비중으로 합친 값입니다. 한쪽 팬이 몰려 평가한
                  경기의 쏠림을 덜어냅니다.
                </p>
                <p>
                  · 숨김 처리된 평가는 제외하며, 평가 {rankings.minVotes}건 이상인 심판만 순위에 포함합니다.
                  (집계 평가 {rankings.totalVotes.toLocaleString()}건)
                </p>
              </div>
            )}

            {rankings && rankings.unranked.length > 0 && (
              <section className="mt-8 md:mt-12">
                <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-2">
                  표본 부족
                </h2>
                <p className="font-mono text-[10px] md:text-xs text-muted-foreground mb-4">
                  평가가 {rankings.minVotes}건 미만이라 순위에서 제외한 심판입니다.
                </p>
                <RankingTable rows={rankings.unranked} backPath={backPath} />
              </section>
            )}
          </>
        )}
      </main>
    </>
  )
}
