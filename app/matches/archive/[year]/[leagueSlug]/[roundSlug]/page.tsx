import Link from "next/link"
import { unstable_cache } from "next/cache"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { deriveMatchStatus } from "@/lib/utils/match-status"
import { shortNameFromSlug } from "@/lib/team-short-names"
import { TextWithEmbedPreview } from "@/components/embed/TextWithEmbedPreview"
import { ArchiveFilters } from "@/components/matches/ArchiveFilters"
import { HotMomentsSection } from "@/components/home/HotMomentsSection"
import { RoundRefereeBestWorstSection } from "@/components/home/RoundRefereeBestWorstSection"
import { getMatchDetailPathWithBack, type MatchForPath } from "@/lib/match-url"
import { formatMatchMinuteForDisplay, formatMomentTimeFromPeriod } from "@/lib/utils/format-match-minute"
import { KakaoAdFit } from "@/components/ads/KakaoAdFit"

export const metadata = {
  title: "경기 기록 | SEE VAR",
  description: "시즌별, 라운드별 경기 일정 및 VAR 판정 데이터",
}

type Params = Promise<{ year: string; leagueSlug: string; roundSlug: string }>

/** 베스트/워스트 심판 영역 — Suspense로 스트리밍되어 경기 목록보다 늦게 도착해도 먼저 보이는 영역은 바로 표시됨 */
async function ArchiveRefereeHighlightSection(props: {
  promise: Promise<{
    bestByRole: Partial<Record<string, import("@/components/home/RoundRefereeBestWorstSection").RefereeCardData>>
    worstByRole: Partial<Record<string, import("@/components/home/RoundRefereeBestWorstSection").RefereeCardData>>
    allRoundReferees: Array<{
      id: string
      slug: string
      name: string
      role: string
      avg: number
      voteCount: number
      matchForDisplay?: { homeName: string; awayName: string; matchPath: string }
    }>
  }>
  leagueName: string
  roundNumber: number
}) {
  const { bestByRole, worstByRole, allRoundReferees } = await props.promise
  return (
    <RoundRefereeBestWorstSection
      bestByRole={bestByRole}
      worstByRole={worstByRole}
      allRoundReferees={allRoundReferees}
      leagueName={props.leagueName}
      roundNumber={props.roundNumber}
    />
  )
}

export default async function MatchesArchivePage({ params }: { params: Params }) {
  const { year: yearStr, leagueSlug, roundSlug } = await params
  const year = parseInt(yearStr, 10)
  if (Number.isNaN(year) || yearStr.length !== 4) notFound()

  const season = await prisma.season.findUnique({ where: { year } })
  if (!season) notFound()

  const seasonId = season.id
  const hasLeagueSlug = leagueSlug && leagueSlug !== "_"
  let league = hasLeagueSlug
    ? await prisma.league.findFirst({
      where: {
        seasonId,
        slug: { equals: leagueSlug, mode: "insensitive" },
      },
    })
    : null

  // URL의 리그가 이 시즌에 없으면(예: 2025에 kleague1 없고 kleague2만 있음) 첫 리그·첫 라운드로 이동
  if (hasLeagueSlug && !league) {
    const firstLeagueWithRound = await prisma.league.findFirst({
      where: { seasonId, rounds: { some: {} } },
      orderBy: { slug: "asc" },
      include: {
        rounds: { orderBy: { number: "asc" }, take: 1, select: { slug: true } },
      },
    })
    if (firstLeagueWithRound?.rounds[0]) {
      redirect(
        `/matches/archive/${yearStr}/${firstLeagueWithRound.slug}/${firstLeagueWithRound.rounds[0].slug}`,
      )
    }
    const firstLeague = await prisma.league.findFirst({
      where: { seasonId },
      orderBy: { slug: "asc" },
    })
    if (firstLeague) {
      redirect(`/matches/archive/${yearStr}/${firstLeague.slug}/round-1`)
    }
  }

  const round =
    league &&
    (await prisma.round.findFirst({
      where: { leagueId: league.id, slug: roundSlug },
      include: { league: { include: { season: true } } },
    }))

  const leagueId = league?.id
  const roundId = round?.id

  type MomentWithMatch = Awaited<
    ReturnType<
      typeof prisma.moment.findMany<{
        include: {
          match: {
            include: { homeTeam: true; awayTeam: true; round: { include: { league: true } } }
          }
        }
      }>
    >
  >[number]

  const ROLE_LABEL: Record<string, string> = {
    MAIN: "주심",
    ASSISTANT: "부심",
    WAITING: "대기심",
    VAR: "VAR (비디오 판독)",
  }

  const REFEREE_ROLE_ORDER = ["MAIN", "ASSISTANT", "WAITING", "VAR"] as const
  function formatMatchReferees(matchReferees: { role: string; referee: { name: string } }[]) {
    const byRole = new Map<string, string[]>()
    for (const mr of matchReferees) {
      const list = byRole.get(mr.role) ?? []
      list.push(mr.referee.name)
      byRole.set(mr.role, list)
    }
    const parts: { key: string; label: string; names: string[] }[] = []
    for (const role of REFEREE_ROLE_ORDER) {
      const names = byRole.get(role)
      if (names?.length) parts.push({ key: role, label: role === "VAR" ? "VAR" : (ROLE_LABEL[role] ?? role), names })
    }
    return parts
  }

  type MatchWithRound = Awaited<
    ReturnType<
      typeof prisma.match.findMany<{
        include: {
          homeTeam: true
          awayTeam: true
          round: { include: { league: true } }
          matchReferees: { include: { referee: true }; orderBy: { role: "asc" } }
        }
      }>
    >
  >[number]

  let seasons: { year: number; name: string }[] = []
  let leagues: { slug: string; name: string }[] = []
  let roundsForFilter: { slug: string; number: number }[] = []
  let matches: MatchWithRound[] = []
  let rawHotMoments: MomentWithMatch[] = []
  const ROLES_FOR_BEST_WORST = ["MAIN", "VAR", "ASSISTANT", "WAITING"] as const
  type RefereeCardPayload = {
    refereeId: string
    slug: string
    name: string
    role: string
    avg: number
    voteCount: number
    /** 같은 경기·같은 역할·동일 평점인 다른 심판 (이름, 슬러그) */
    peerRefs?: { name: string; slug: string }[]
    matchForDisplay?: {
      homeName: string
      awayName: string
      matchPath: string
      homeEmblemPath?: string | null
      awayEmblemPath?: string | null
    }
    reviews: {
      id: string
      userName: string
      userHandle?: string | null
      userImage?: string | null
      teamName: string | null
      teamSlug: string | null
      teamEmblem: string | null
      likeCount: number
      comment: string
      matchLabel: string
      rating: number
    }[]
  }
  /** 경기 목록 + 쟁점 순간만 조회 (TTFB 단축용, 베스트/워스트는 Suspense로 별도 스트리밍) */
  function getRoundMatchesAndMomentsCached(roundIdParam: string, seasonIdParam: string) {
    return unstable_cache(
      async () => {
        const [matchesRes, rawHotMomentsRes] = await Promise.all([
          prisma.match.findMany({
            where: {
              roundId: roundIdParam,
              round: { league: { seasonId: seasonIdParam } },
            },
            take: 100,
            orderBy: { playedAt: "asc" },
            include: {
              homeTeam: true,
              awayTeam: true,
              round: { include: { league: { include: { season: true } } } },
              matchReferees: { include: { referee: true }, orderBy: { role: "asc" } },
            },
          }),
          prisma.moment
            .findMany({
              where: {
                match: {
                  roundId: roundIdParam,
                  round: { league: { seasonId: seasonIdParam } },
                },
              },
              take: 10,
              orderBy: { seeVarCount: "desc" },
              include: {
                match: {
                  include: {
                    homeTeam: true,
                    awayTeam: true,
                    round: { include: { league: true } },
                  },
                },
                comments: {
                  where: { parentId: null, status: "VISIBLE" },
                  take: 1,
                  orderBy: { createdAt: "asc" },
                  select: { content: true },
                },
              },
            })
            .catch((e: { code?: string }) => (e?.code === "P2021" ? [] : Promise.reject(e))),
        ])
        return { matchesRes, rawHotMomentsRes }
      },
      ["archive-round-matches", roundIdParam, seasonIdParam],
      { revalidate: 60, tags: ["archive-rounds"] },
    )()
  }

  /** 베스트/워스트 심판 집계만 조회 (Suspense 경계에서 사용해 스트리밍) */
  function getRoundRefereeHighlightsCached(
    roundIdParam: string,
    seasonIdParam: string,
    archiveBackPath: string,
  ) {
    return unstable_cache(
      async () => {
        const reviewsRes = await prisma.refereeReview.findMany({
          where: {
            status: "VISIBLE",
            match: {
              roundId: roundIdParam,
              round: { league: { seasonId: seasonIdParam } },
            },
          },
          include: {
            referee: true,
            match: {
              include: {
                homeTeam: true,
                awayTeam: true,
                round: { include: { league: { include: { season: true } } } },
              },
            },
            fanTeam: {
              select: { name: true, slug: true, emblemPath: true },
            },
            user: {
              select: { name: true, handle: true, image: true },
            },
            reactions: {
              select: { type: true },
            },
          },
        })
        const bestByRole: Partial<Record<string, RefereeCardPayload>> = {}
        const worstByRole: Partial<Record<string, RefereeCardPayload>> = {}
        const byRef = new Map<
          string,
          {
            refereeId: string
            refereeSlug: string
            name: string
            role: string
            matchId: string
            sum: number
            count: number
            homeSum: number
            homeCount: number
            awaySum: number
            awayCount: number
            matchForDisplay: { homeName: string; awayName: string; matchPath: string; homeEmblemPath?: string | null; awayEmblemPath?: string | null }
            reviews: RefereeCardPayload["reviews"]
          }
        >()
        for (const r of reviewsRes) {
          const key = `${r.refereeId}:${r.role}`
          const cur = byRef.get(key)
          const likeCount = r.reactions.filter((rx) => rx.type === "LIKE").length
          const homeName = r.match.homeTeam.name
          const awayName = r.match.awayTeam.name
          const match = r.match as { homeTeamId: string; awayTeamId: string }
          const isHomeFan = r.fanTeamId != null && r.fanTeamId === match.homeTeamId
          const isAwayFan = r.fanTeamId != null && r.fanTeamId === match.awayTeamId
          const matchForDisplay = {
            homeName,
            awayName,
            matchPath:
              getMatchDetailPathWithBack(r.match as unknown as MatchForPath, archiveBackPath) +
              "&scroll=referee-rating&referee=" +
              encodeURIComponent((r.referee as { slug: string }).slug),
            homeEmblemPath: (r.match.homeTeam as { emblemPath: string | null }).emblemPath ?? null,
            awayEmblemPath: (r.match.awayTeam as { emblemPath: string | null }).emblemPath ?? null,
          }
          if (r.comment) {
            const summary = {
              id: r.id,
              userName: r.user?.name || "Supporter",
              userHandle: (r.user as { handle?: string | null })?.handle ?? null,
              userImage: (r.user as { image?: string | null })?.image ?? null,
              teamName: r.fanTeam?.name ?? null,
              teamSlug: r.fanTeam?.slug ?? null,
              teamEmblem: r.fanTeam?.emblemPath ?? null,
              likeCount,
              comment: r.comment,
              matchLabel: `${homeName} vs ${awayName}`,
              rating: r.rating,
            }
            if (cur) {
              cur.reviews.push(summary)
              cur.sum += r.rating
              cur.count += 1
              if (isHomeFan) {
                cur.homeSum += r.rating
                cur.homeCount += 1
              }
              if (isAwayFan) {
                cur.awaySum += r.rating
                cur.awayCount += 1
              }
            } else {
              byRef.set(key, {
                refereeId: r.refereeId,
                refereeSlug: (r.referee as { slug: string }).slug ?? r.refereeId,
                name: r.referee.name,
                role: r.role,
                matchId: r.matchId,
                sum: r.rating,
                count: 1,
                homeSum: isHomeFan ? r.rating : 0,
                homeCount: isHomeFan ? 1 : 0,
                awaySum: isAwayFan ? r.rating : 0,
                awayCount: isAwayFan ? 1 : 0,
                matchForDisplay,
                reviews: [summary],
              })
              continue
            }
          } else {
            if (cur) {
              cur.sum += r.rating
              cur.count += 1
              if (isHomeFan) {
                cur.homeSum += r.rating
                cur.homeCount += 1
              }
              if (isAwayFan) {
                cur.awaySum += r.rating
                cur.awayCount += 1
              }
            } else {
              byRef.set(key, {
                refereeId: r.refereeId,
                refereeSlug: (r.referee as { slug: string }).slug ?? r.refereeId,
                name: r.referee.name,
                role: r.role,
                matchId: r.matchId,
                sum: r.rating,
                count: 1,
                homeSum: isHomeFan ? r.rating : 0,
                homeCount: isHomeFan ? 1 : 0,
                awaySum: isAwayFan ? r.rating : 0,
                awayCount: isAwayFan ? 1 : 0,
                matchForDisplay,
                reviews: [],
              })
            }
          }
        }
        const stats = [...byRef.values()].map((v) => ({
          refereeId: v.refereeId,
          refereeSlug: v.refereeSlug,
          name: v.name,
          role: v.role,
          matchId: v.matchId,
          avg: v.count > 0 ? v.sum / v.count : 0,
          voteCount: v.count,
          matchForDisplay: v.matchForDisplay,
          homeAvg: v.homeCount > 0 ? v.homeSum / v.homeCount : undefined,
          awayAvg: v.awayCount > 0 ? v.awaySum / v.awayCount : undefined,
          reviews: v.reviews.sort((a, b) => b.likeCount - a.likeCount).slice(0, 3),
        }))
        const allRoundReferees = [...stats].sort((a, b) => {
          const diff = b.avg - a.avg
          if (Math.abs(diff) > 1e-6) return diff
          return b.voteCount - a.voteCount
        }).map((s) => ({
          id: s.refereeId,
          slug: s.refereeSlug,
          name: s.name,
          role: s.role,
          avg: s.avg,
          voteCount: s.voteCount,
          matchForDisplay: s.matchForDisplay,
          homeAvg: s.homeAvg,
          awayAvg: s.awayAvg,
        }))

        if (stats.length > 0) {
          for (const role of ROLES_FOR_BEST_WORST) {
            const byRole = stats.filter((s) => s.role === role)
            const byBest = [...byRole].sort((a, b) => {
              const diff = b.avg - a.avg
              if (Math.abs(diff) > 1e-6) return diff
              return b.voteCount - a.voteCount
            })
            const byWorst = [...byRole].sort((a, b) => {
              const diff = a.avg - b.avg
              if (Math.abs(diff) > 1e-6) return diff
              return b.voteCount - a.voteCount
            })
            const best = byBest[0]
            const worst = byWorst[0]
            if (best) {
              const bestPeers = byRole.filter(
                (s) =>
                  s.refereeId !== best.refereeId &&
                  s.matchId === best.matchId &&
                  Math.abs(s.avg - best.avg) < 1e-6,
              )
              bestByRole[role] = {
                refereeId: best.refereeId,
                slug: best.refereeSlug,
                name: best.name,
                role: best.role,
                avg: best.avg,
                voteCount: best.voteCount,
                peerRefs:
                  bestPeers.length > 0
                    ? bestPeers.map((p) => ({ name: p.name, slug: p.refereeSlug }))
                    : undefined,
                matchForDisplay: best.matchForDisplay,
                reviews: best.reviews,
              }
            }
            if (worst) {
              const worstPeers = byRole.filter(
                (s) =>
                  s.refereeId !== worst.refereeId &&
                  s.matchId === worst.matchId &&
                  Math.abs(s.avg - worst.avg) < 1e-6,
              )
              worstByRole[role] = {
                refereeId: worst.refereeId,
                slug: worst.refereeSlug,
                name: worst.name,
                role: worst.role,
                avg: worst.avg,
                voteCount: worst.voteCount,
                peerRefs:
                  worstPeers.length > 0
                    ? worstPeers.map((p) => ({ name: p.name, slug: p.refereeSlug }))
                    : undefined,
                matchForDisplay: worst.matchForDisplay,
                reviews: worst.reviews,
              }
            }
          }
        }
        return { bestByRole, worstByRole, allRoundReferees }
      },
      ["archive-round-referee-highlights", roundIdParam, seasonIdParam, archiveBackPath],
      { revalidate: 60, tags: ["archive-rounds"] },
    )()
  }

  // 필터: 시즌 → 해당 시즌의 모든 리그 → 해당 리그의 모든 라운드 (경기 일자와 무관하게 시즌 구조 기준으로 노출)
  const [seasonsRes, leaguesRes] = await Promise.all([
    prisma.season.findMany({
      where: { leagues: { some: {} } },
      orderBy: { year: "desc" },
    }),
    prisma.league.findMany({
      where: { seasonId },
      orderBy: { slug: "asc" },
      select: { slug: true, name: true },
    }),
  ])
  seasons = seasonsRes.map((s) => ({ year: s.year, name: String(s.year) }))
  leagues = leaguesRes.map((l) => ({ slug: l.slug, name: l.name }))

  let roundsRes: { slug: string; number: number }[] = []
  if (leagueId) {
    const rows = await prisma.round.findMany({
      where: { leagueId },
      orderBy: { number: "asc" },
      select: { slug: true, number: true },
    })
    roundsRes = rows
  }
  roundsForFilter = roundsRes

  // 선택한 리그에 라운드가 없으면, 같은 시즌에서 라운드가 있는 리그로 자동 이동
  if (leagueId && roundsRes.length === 0 && leaguesRes.length > 1) {
    const leagueWithRound = await prisma.league.findFirst({
      where: {
        seasonId,
        rounds: { some: {} },
      },
      orderBy: { slug: "asc" },
      include: {
        rounds: { orderBy: { number: "asc" }, take: 1, select: { slug: true } },
      },
    })
    if (leagueWithRound?.rounds[0]) {
      redirect(
        `/matches/archive/${yearStr}/${leagueWithRound.slug}/${leagueWithRound.rounds[0].slug}`,
      )
    }
  }

  // 리그에는 라운드가 있는데 URL의 round가 이 리그에 없으면(예: round-1인데 K2에는 round-37만 있음) 첫 라운드로 이동
  if (leagueId && roundsRes.length > 0 && !round) {
    redirect(
      `/matches/archive/${yearStr}/${leagueSlug}/${roundsRes[0].slug}`,
    )
  }

  if (roundId) {
    const { matchesRes, rawHotMomentsRes } = await getRoundMatchesAndMomentsCached(roundId, seasonId)
    matches = matchesRes
    rawHotMoments = rawHotMomentsRes
  }

  const hotList = rawHotMoments.map((mom, i) => {
    const homeTeam = mom.match.homeTeam as unknown as { name: string; slug: string | null; emblemPath: string | null }
    const awayTeam = mom.match.awayTeam as unknown as { name: string; slug: string | null; emblemPath: string | null }
    const comments = (mom as { comments?: { content: string }[] }).comments
    const firstContent = comments?.[0]?.content
    const firstCommentPreview = firstContent
      ? firstContent.replace(/\s+/g, " ").trim().slice(0, 40) + (firstContent.length > 40 ? "…" : "")
      : undefined
    return {
      rank: i + 1,
      momentId: mom.id,
      matchId: mom.matchId,
      league: mom.match.round.league.name.toUpperCase(),
      homeName: shortNameFromSlug(homeTeam.slug),
      awayName: shortNameFromSlug(awayTeam.slug),
      homeEmblem: homeTeam.emblemPath ?? "",
      awayEmblem: awayTeam.emblemPath ?? "",
      time: mom.startPeriod != null && mom.startMinuteInPeriod != null
        ? formatMomentTimeFromPeriod(mom.startPeriod, mom.startMinuteInPeriod)
        : mom.startMinute != null
          ? formatMatchMinuteForDisplay(mom.startMinute)
          : (mom.title ?? "—"),
      varCount: mom.seeVarCount,
      commentCount: mom.commentCount,
      firstCommentPreview,
      matchDetailPath: `/matches/game/${yearStr}/${leagueSlug}/${roundSlug}/${(mom.match as { roundOrder: number }).roundOrder}`,
    }
  })

  const tz = "Asia/Seoul"
  const formatDate = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(new Date(d))
        .replace(/-/g, "/")
      : "—"
  const formatTime = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(d))
      : "—"

  const getYouTubeEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null
    try {
      const u = new URL(url)
      let id: string | null = null
      if (u.hostname.includes("youtu.be")) {
        id = u.pathname.replace("/", "")
      } else if (u.hostname.includes("youtube.com")) {
        id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).at(-1) || null
      }
      if (!id) return null
      return `https://www.youtube.com/embed/${id}`
    } catch {
      return null
    }
  }

  const getInstagramEmbedUrl = (url: string | null | undefined) => {
    if (!url) return null
    try {
      const u = new URL(url)
      const parts = u.pathname.split("/").filter(Boolean)
      if (parts.length < 2) return null
      const type = parts[0] // p, reel, tv 등
      const code = parts[1]
      if (!code) return null
      return `https://www.instagram.com/${type}/${code}/embed/`
    } catch {
      return null
    }
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl((round as { youtubeUrl?: string | null } | null)?.youtubeUrl)
  const instagramEmbedUrl = getInstagramEmbedUrl(
    (round as { instagramUrl?: string | null } | null)?.instagramUrl
  )

  return (
    <main className="py-8 md:py-12">
      <div className="w-full flex justify-center items-center mb-8">
        <KakaoAdFit />
      </div>
      <header className="mb-8 md:mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
            경기 기록
          </h1>
          <p className="font-mono text-xs md:text-sm text-muted-foreground">
            시즌별, 라운드별 경기 일정 및 VAR 판정 데이터를 확인하세요.
          </p>
        </div>
        <Suspense fallback={<div className="h-10 w-48 bg-card border border-border animate-pulse" />}>
          <ArchiveFilters
            seasons={seasons}
            leagues={leagues}
            rounds={roundsForFilter}
            currentYear={year}
            currentLeagueSlug={leagueSlug}
            currentRoundSlug={roundSlug}
          />
        </Suspense>
      </header>

      {/* 역할별 베스트/워스트 심판 (Suspense로 스트리밍 — 경기 목록보다 늦게 와도 먼저 보이는 영역은 바로 표시) */}
      {round && (
        <Suspense
          fallback={
            <section className="mb-8 md:mb-12">
              <div className="h-48 md:h-56 w-full rounded border border-border bg-card/50 animate-pulse" />
            </section>
          }
        >
          <ArchiveRefereeHighlightSection
            promise={getRoundRefereeHighlightsCached(
              round.id,
              seasonId,
              `/matches/archive/${yearStr}/${leagueSlug}/${roundSlug}`,
            )}
            leagueName={round.league.name}
            roundNumber={round.number}
          />
        </Suspense>
      )}

      {/* HOT MOMENTS */}
      {hotList.length === 0 ? (
        <section className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
            라운드 쟁점 순간
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            등록된 모멘트가 없습니다.
          </p>
        </section>
      ) : (
        <HotMomentsSection hotMoments={hotList} title="라운드 쟁점 순간" />
      )}


      <section className="mb-8 md:mb-12">
        <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
          라운드 경기 일정
        </h2>
        <div className="ledger-surface overflow-hidden">
          <div className="hidden md:grid grid-cols-12 bg-card/50 p-4 border-b border-border font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <div className="col-span-2">Date / Time</div>
            <div className="col-span-1 text-center">League</div>
            <div className="col-span-7 text-center">Matchup</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          <div className="divide-y divide-border">
            {matches.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                등록된 경기가 없습니다.
              </div>
            ) : (
              matches.map((m) => (
                <Link
                  key={m.id}
                  href={getMatchDetailPathWithBack(m as unknown as MatchForPath, `/matches/archive/${yearStr}/${leagueSlug}/${roundSlug}`)}
                  prefetch={false}
                  className="block p-4 md:p-6 match-row group md:grid md:grid-cols-12 md:items-center"
                >
                  {/* 모바일: 카드형 세로 배치 */}
                  <div className="flex flex-col gap-3 md:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-bold">{formatDate(m.playedAt)}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {formatTime(m.playedAt)} KST
                        </p>
                      </div>
                      {(() => {
                        const slug = (m.round.league as unknown as { slug: string }).slug
                        const norm = slug?.toLowerCase().replace(/-/g, "") ?? ""
                        const isK1 = norm === "kleague1"
                        const isK2 = norm === "kleague2"
                        return (
                          <span
                            className={
                              slug === "supercup"
                                ? "bg-amber-600/90 text-white px-2 py-1 text-[10px] font-black italic shrink-0"
                                : isK1
                                  ? "bg-primary text-primary-foreground px-2 py-1 text-[10px] font-black italic shrink-0"
                                  : "bg-muted text-primary px-2 py-1 text-[10px] font-black italic shrink-0"
                            }
                          >
                            {slug === "supercup" ? "SUPER CUP" : isK1 ? "K1" : isK2 ? "K2" : slug?.toUpperCase() ?? "—"}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        <span className="font-black italic text-sm uppercase truncate text-right">
                          {m.homeTeam.name}
                        </span>
                        {(m.homeTeam as unknown as { emblemPath: string | null }).emblemPath && (
                          <img
                            src={(m.homeTeam as unknown as { emblemPath: string | null }).emblemPath!}
                            alt=""
                            className="w-8 h-8 shrink-0"
                          />
                        )}
                      </div>
                      <div className="flex flex-col items-center shrink-0 px-1">
                        {(() => {
                          const status = deriveMatchStatus(m.playedAt, { storedStatus: m.status })
                          return status === "LIVE" && m.scoreHome != null && m.scoreAway != null ? (
                            <>
                              <span className="text-lg font-black italic tracking-tighter whitespace-nowrap">
                                {m.scoreHome} : {m.scoreAway}
                              </span>
                              <span className="font-mono text-[9px] text-primary font-bold">LIVE</span>
                            </>
                          ) : status === "FINISHED" && m.scoreHome != null && m.scoreAway != null ? (
                            <>
                              <span className="text-lg font-black italic tracking-tighter whitespace-nowrap">
                                {m.scoreHome} : {m.scoreAway}
                              </span>
                              <span className="font-mono text-[9px] text-muted-foreground font-bold uppercase">
                                Finished
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">VS</span>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-start">
                        {(m.awayTeam as unknown as { emblemPath: string | null }).emblemPath && (
                          <img
                            src={(m.awayTeam as unknown as { emblemPath: string | null }).emblemPath!}
                            alt=""
                            className="w-8 h-8 shrink-0"
                          />
                        )}
                        <span className="font-black italic text-sm uppercase truncate text-left">
                          {m.awayTeam.name}
                        </span>
                      </div>
                    </div>
                    {m.venue?.trim() && (
                      <p className="font-mono text-sm text-muted-foreground text-center">
                        {m.venue.trim()}
                      </p>
                    )}
                    {"matchReferees" in m && Array.isArray(m.matchReferees) && m.matchReferees.length > 0 && (() => {
                      const parts = formatMatchReferees(m.matchReferees)
                      const row1 = parts.filter((p) => p.key === "MAIN" || p.key === "ASSISTANT")
                      const row2 = parts.filter((p) => p.key === "WAITING" || p.key === "VAR")
                      const renderPart = ({ key, label, names }: { key: string; label: string; names: string[] }) =>
                        key === "VAR" ? (
                          <span key={key}>
                            <span className="font-bold text-foreground/80">{label}</span>
                            <span className="mx-0.5">·</span>
                            <span>{names.join(", ")}</span>
                          </span>
                        ) : (
                          names.map((name, i) => (
                            <span key={`${key}-${name}-${i}`}>
                              <span className="font-bold text-foreground/80">{label}</span>
                              <span className="mx-0.5">·</span>
                              <span>{name}</span>
                            </span>
                          ))
                        )
                      return (
                        <div className="flex flex-col gap-1 items-center text-center">
                          <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 font-mono text-sm text-muted-foreground">
                            {row1.map((p) => renderPart(p))}
                          </div>
                          <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 font-mono text-sm text-muted-foreground">
                            {row2.map((p) => renderPart(p))}
                          </div>
                        </div>
                      )
                    })()}
                    <span className="self-end border border-border px-4 py-2.5 text-[10px] font-bold font-mono group-hover:bg-foreground group-hover:text-background transition-all">
                      경기 상세
                    </span>
                  </div>

                  {/* 데스크톱: 기존 12컬럼 그리드 */}
                  <div className="hidden md:contents">
                    <div className="col-span-2">
                      <p className="font-mono text-xs font-bold">{formatDate(m.playedAt)}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {formatTime(m.playedAt)} KST
                      </p>
                    </div>
                    <div className="col-span-1 text-center">
                      {(() => {
                        const slug = (m.round.league as unknown as { slug: string }).slug
                        const norm = slug?.toLowerCase().replace(/-/g, "") ?? ""
                        const isK1 = norm === "kleague1"
                        const isK2 = norm === "kleague2"
                        return (
                          <span
                            className={
                              slug === "supercup"
                                ? "bg-amber-600/90 text-white px-2 py-0.5 text-[9px] font-black italic"
                                : isK1
                                  ? "bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-black italic"
                                  : "bg-muted text-primary px-2 py-0.5 text-[9px] font-black italic"
                            }
                          >
                            {slug === "supercup" ? "SUPER CUP" : isK1 ? "K1" : isK2 ? "K2" : slug?.toUpperCase() ?? "—"}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="col-span-7 flex flex-col gap-2">
                      <div className="flex items-center justify-center gap-4 md:gap-8">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end">
                          <span className="font-black italic text-sm md:text-lg uppercase truncate">
                            {m.homeTeam.name}
                          </span>
                          {(m.homeTeam as unknown as { emblemPath: string | null }).emblemPath && (
                            <img
                              src={(m.homeTeam as unknown as { emblemPath: string | null }).emblemPath!}
                              alt=""
                              className="w-6 h-6 md:w-8 md:h-8 shrink-0"
                            />
                          )}
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                          {(() => {
                            const status = deriveMatchStatus(m.playedAt, { storedStatus: m.status })
                            return status === "LIVE" && m.scoreHome != null && m.scoreAway != null ? (
                              <>
                                <span className="text-xl md:text-2xl font-black italic tracking-tighter whitespace-nowrap">
                                  {m.scoreHome} : {m.scoreAway}
                                </span>
                                <span className="font-mono text-[8px] text-primary font-bold">LIVE</span>
                              </>
                            ) : status === "FINISHED" && m.scoreHome != null && m.scoreAway != null ? (
                              <>
                                <span className="text-xl md:text-2xl font-black italic tracking-tighter whitespace-nowrap">
                                  {m.scoreHome} : {m.scoreAway}
                                </span>
                                <span className="font-mono text-[8px] text-muted-foreground font-bold uppercase">
                                  Finished
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-sm">VS</span>
                            )
                          })()}
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-start">
                          {(m.awayTeam as unknown as { emblemPath: string | null }).emblemPath && (
                            <img
                              src={(m.awayTeam as unknown as { emblemPath: string | null }).emblemPath!}
                              alt=""
                              className="w-6 h-6 md:w-8 md:h-8 shrink-0"
                            />
                          )}
                          <span className="font-black italic text-sm md:text-lg uppercase truncate">
                            {m.awayTeam.name}
                          </span>
                        </div>
                      </div>
                      {m.venue?.trim() && (
                        <p className="font-mono text-xs md:text-sm text-muted-foreground text-center">
                          {m.venue.trim()}
                        </p>
                      )}
                      {"matchReferees" in m && Array.isArray(m.matchReferees) && m.matchReferees.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs md:text-sm text-muted-foreground">
                          {formatMatchReferees(m.matchReferees).map(({ key, label, names }) =>
                            key === "VAR" ? (
                              <span key={key}>
                                <span className="font-bold text-foreground/80">{label}</span>
                                <span className="mx-1">·</span>
                                <span>{names.join(", ")}</span>
                              </span>
                            ) : (
                              names.map((name, i) => (
                                <span key={`${key}-${name}-${i}`}>
                                  <span className="font-bold text-foreground/80">{label}</span>
                                  <span className="mx-1">·</span>
                                  <span>{name}</span>
                                </span>
                              ))
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="border border-border px-4 py-2 text-[10px] font-bold font-mono group-hover:bg-foreground group-hover:text-background transition-all inline-block">
                        경기 상세
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <KakaoAdFit />

      {/* 라운드 판정 리포트 - 페이지 가장 하단 */}
      {(youtubeEmbedUrl || instagramEmbedUrl) && (
        <section className="mt-8 md:mt-12">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-4">
            라운드 판정 리포트
          </h2>
          <div className="flex flex-col gap-4 md:gap-6">
            {youtubeEmbedUrl && (
              <div className="border border-border bg-card/60 p-3 md:p-4">
                <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Round Review · YouTube
                </p>
                <div className="relative w-full pt-[56.25%] bg-black border border-border overflow-hidden">
                  <iframe
                    src={youtubeEmbedUrl}
                    title="Round review video"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            {instagramEmbedUrl && (
              <div className="border border-border bg-card/60 p-3 md:p-4">
                <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Card News · Instagram
                </p>
                <div className="relative w-full pt-[125%] bg-black border border-border overflow-hidden">
                  <iframe
                    src={instagramEmbedUrl}
                    title="Round card news"
                    className="absolute inset-0 w-full h-full"
                    allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
