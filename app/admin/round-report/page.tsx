import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { formatRoundReportText, getRoundReport } from "@/lib/services/round-report"
import { ROLES_FOR_BEST_WORST } from "@/lib/services/round-referee-highlights"
import { SITE_URL } from "@/lib/site"
import { formatRating } from "@/lib/utils/stats"
import { AdminResultsFilter } from "../results/AdminResultsFilter"
import { CopyTextButton } from "./CopyTextButton"

export const metadata = {
  title: "라운드 리포트 자료 | 관리자 | SEE VAR",
  description: "라운드 판정 리포트(영상·카드뉴스) 제작용 집계 자료",
}

type SearchParams = Promise<{ year?: string; league?: string; round?: string }>

const ROLE_LABEL: Record<string, string> = {
  MAIN: "주심",
  VAR: "VAR",
  ASSISTANT: "부심",
  WAITING: "대기심",
}

export default async function AdminRoundReportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()
  const params = await searchParams

  const seasons = await prisma.season.findMany({
    orderBy: { year: "desc" },
    select: { id: true, year: true },
  })
  if (seasons.length === 0) {
    return (
      <main className="max-w-5xl mx-auto pb-12">
        <p className="font-mono text-muted-foreground">시즌이 없습니다.</p>
      </main>
    )
  }

  const year = params.year ? parseInt(params.year, 10) : seasons[0].year
  const season = seasons.find((s) => s.year === year) ?? seasons[0]
  const leagues = await prisma.league.findMany({
    where: { seasonId: season.id },
    orderBy: { slug: "asc" },
    select: { id: true, name: true, slug: true },
  })
  const league = leagues.find((l) => l.slug === params.league) ?? leagues[0]
  const rounds = league
    ? await prisma.round.findMany({
        where: { leagueId: league.id },
        orderBy: { number: "asc" },
        select: { id: true, number: true, slug: true, isFocus: true },
      })
    : []
  // 따로 고르지 않았으면 지금 진행 중인(포커스) 라운드, 없으면 마지막 라운드
  const round =
    rounds.find((r) => r.slug === params.round) ??
    rounds.find((r) => r.isFocus) ??
    rounds[rounds.length - 1]

  const report = round ? await getRoundReport(round.id) : null
  const reportText = report ? formatRoundReportText(report, SITE_URL) : ""

  return (
    <main className="max-w-5xl mx-auto pb-12 md:pb-16">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 관리자
        </Link>
      </div>
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
        라운드 리포트 자료
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        라운드 판정 리포트(영상·카드뉴스)를 만들 때 필요한 수치를 한곳에 모았습니다. 사이트에 노출되는
        값과 같은 기준(숨김 평가 제외, 평가 수 보정)으로 집계하며, 맨 아래에서 텍스트로 복사할 수 있습니다.
      </p>

      <AdminResultsFilter
        seasons={seasons}
        leagues={leagues}
        rounds={rounds}
        currentYear={season.year}
        currentLeagueSlug={league?.slug ?? ""}
        currentRoundSlug={round?.slug ?? ""}
        baseUrl="/admin/round-report"
      />

      {!report ? (
        <p className="font-mono text-sm text-muted-foreground">선택한 리그에 라운드가 없습니다.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="font-mono text-sm font-black uppercase tracking-widest mb-3">{report.title} · 참여</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "심판 평가", value: `${report.participation.votes}건` },
                { label: "평가 참여", value: `${report.participation.voters}명` },
                {
                  label: "평가된 경기",
                  value: `${report.participation.ratedMatches}/${report.participation.totalMatches}`,
                },
                { label: "쟁점 순간", value: `${report.participation.moments}건` },
                { label: "이의 제기", value: `${report.participation.seeVarTotal}` },
                { label: "쟁점 댓글", value: `${report.participation.comments}` },
              ].map((tile) => (
                <div key={tile.label} className="ledger-surface p-3 md:p-4 text-center">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">{tile.label}</p>
                  <p className="text-xl md:text-2xl font-black italic font-mono">{tile.value}</p>
                </div>
              ))}
            </div>
          </section>

          {ROLES_FOR_BEST_WORST.map((role) => {
            const rows = report.referees.filter((stat) => stat.role === role)
            if (rows.length === 0) return null
            const best = report.bestByRole[role]
            const worst = report.worstByRole[role]
            return (
              <section key={role}>
                <h3 className="font-mono text-sm font-black uppercase tracking-widest mb-1">
                  {ROLE_LABEL[role]} 평점
                </h3>
                <p className="font-mono text-xs text-muted-foreground mb-3">
                  최고점 {best ? `${best.name} ${best.avg.toFixed(1)} (${best.voteCount}명)` : "없음"} · 최저점{" "}
                  {worst ? `${worst.name} ${worst.avg.toFixed(1)} (${worst.voteCount}명)` : "없음"}
                </p>
                <div className="ledger-surface overflow-x-auto">
                  <table className="w-full font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border bg-card/50 text-left text-muted-foreground">
                        <th className="p-2.5 font-bold">심판</th>
                        <th className="p-2.5 font-bold">경기</th>
                        <th className="p-2.5 font-bold text-right">평균</th>
                        <th className="p-2.5 font-bold text-right">평가</th>
                        <th className="p-2.5 font-bold text-right">홈팬</th>
                        <th className="p-2.5 font-bold text-right">원정팬</th>
                        <th className="p-2.5 font-bold text-right">제3자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {rows.map((stat) => (
                        <tr key={`${stat.matchId}-${stat.id}`}>
                          <td className="p-2.5 font-bold whitespace-nowrap">{stat.name}</td>
                          <td className="p-2.5 text-muted-foreground">
                            {stat.matchForDisplay ? (
                              <Link href={stat.matchForDisplay.matchPath} className="hover:text-primary">
                                {stat.matchForDisplay.homeName} vs {stat.matchForDisplay.awayName}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-2.5 text-right font-bold tabular-nums">{stat.avg.toFixed(1)}</td>
                          <td className="p-2.5 text-right tabular-nums whitespace-nowrap">
                            {stat.voteCount}명
                            {stat.lowSample && <span className="ml-1 text-amber-400">표본 적음</span>}
                          </td>
                          <td className="p-2.5 text-right tabular-nums text-muted-foreground">
                            {formatRating(stat.homeAvg)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums text-muted-foreground">
                            {formatRating(stat.awayAvg)}
                          </td>
                          <td className="p-2.5 text-right tabular-nums text-muted-foreground">
                            {formatRating(stat.neutralAvg)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}

          {report.perceptionGaps.length > 0 && (
            <section>
              <h3 className="font-mono text-sm font-black uppercase tracking-widest mb-1">
                홈·원정 팬 체감 격차가 큰 판정
              </h3>
              <p className="font-mono text-xs text-muted-foreground mb-3">
                양쪽 팬의 평점 차이가 1점 이상인 심판입니다. 한쪽에 불리했다고 느낀 판정이 있었는지 살펴볼 단서가 됩니다.
              </p>
              <ul className="space-y-2">
                {report.perceptionGaps.map((stat) => (
                  <li key={`${stat.matchId}-${stat.id}-${stat.role}`} className="ledger-surface p-3 font-mono text-xs">
                    <span className="font-bold">{stat.name}</span>{" "}
                    <span className="text-muted-foreground">
                      {ROLE_LABEL[stat.role] ?? stat.role}
                      {stat.matchForDisplay
                        ? ` · ${stat.matchForDisplay.homeName} vs ${stat.matchForDisplay.awayName}`
                        : ""}
                    </span>
                    <span className="ml-2">
                      홈팬 {formatRating(stat.homeAvg)} / 원정팬 {formatRating(stat.awayAvg)}
                    </span>
                    <span className="ml-2 text-primary font-bold">격차 {stat.gap.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="font-mono text-sm font-black uppercase tracking-widest mb-3">쟁점 순간 (이의 제기 많은 순)</h3>
            {report.momentsByCategory.length > 0 && (
              <p className="font-mono text-xs text-muted-foreground mb-3">
                판정 유형: {report.momentsByCategory.map((item) => `${item.label} ${item.count}`).join(" · ")}
              </p>
            )}
            {report.moments.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">등록된 쟁점 순간이 없습니다.</p>
            ) : (
              <ol className="space-y-2">
                {report.moments.map((moment, index) => (
                  <li key={moment.id} className="ledger-surface p-3 font-mono text-xs">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-black italic">{index + 1}.</span>
                      <Link href={moment.path} className="font-bold hover:text-primary">
                        {moment.matchLabel}
                      </Link>
                      <span className="text-primary font-bold">{moment.time}</span>
                      {moment.categoryLabel && (
                        <span className="border border-border px-1.5 py-0.5 text-muted-foreground">
                          {moment.categoryLabel}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        이의 제기 {moment.seeVarCount} · 댓글 {moment.commentCount}
                      </span>
                    </div>
                    {moment.summary && <p className="mt-1.5 text-muted-foreground">{moment.summary}</p>}
                    {moment.law && (
                      <p className="mt-1 text-muted-foreground/80">관련 규정: IFAB 경기규칙 {moment.law}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {report.topComments.length > 0 && (
            <section>
              <h3 className="font-mono text-sm font-black uppercase tracking-widest mb-3">공감 많은 한줄평</h3>
              <ul className="space-y-2">
                {report.topComments.map((comment) => (
                  <li key={comment.id} className="ledger-surface p-3 font-mono text-xs">
                    <p>{comment.comment}</p>
                    <p className="mt-1.5 text-muted-foreground">
                      ★{comment.rating} · {comment.userName}
                      {comment.teamName ? ` (${comment.teamName})` : ""} · 좋아요 {comment.likeCount} →{" "}
                      {comment.refereeName} {ROLE_LABEL[comment.role] ?? comment.role}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-mono text-sm font-black uppercase tracking-widest">복사용 텍스트</h3>
              <CopyTextButton text={reportText} />
            </div>
            <textarea
              readOnly
              value={reportText}
              rows={18}
              className="w-full bg-card border border-border p-3 font-mono text-xs leading-relaxed focus:border-primary outline-none"
            />
          </section>
        </div>
      )}
    </main>
  )
}
