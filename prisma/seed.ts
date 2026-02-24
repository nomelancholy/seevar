import "../lib/database-url"
import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { join } from "path"

const prisma = new PrismaClient()

// 엠블럼 경로: public/assets 기준
const EMBLEM = (league: "kleague1" | "kleague2", file: string) =>
  `/assets/emblem/2026/${league}/${file}.svg`

// TEAM_LIST.md 순서·정확한 팀명 (app/assets/docs/TEAM_LIST.md)
const K1_TEAMS: { name: string; emblem: string }[] = [
  { name: "울산 HD FC", emblem: "ulsan_hd_fc" },
  { name: "강원 FC", emblem: "gangwon_fc" },
  { name: "FC 서울", emblem: "fc_seoul" },
  { name: "포항 스틸러스", emblem: "pohang_steelers" },
  { name: "전북 현대 모터스", emblem: "jeonbuk_hyundai_motors" },
  { name: "대전 하나 시티즌", emblem: "daejeon_hana_citizen" },
  { name: "김천 상무 FC", emblem: "gimcheon_sangmu_fc" },
  { name: "제주 SK FC", emblem: "jeju_sk_fc" },
  { name: "인천 유나이티드", emblem: "incheon_united_fc" },
  { name: "광주 FC", emblem: "gwangju_fc" },
  { name: "FC 안양", emblem: "fc_anyang" },
  { name: "부천 FC 1995", emblem: "bucheon_fc_1995" },
]
const K2_TEAMS: { name: string; emblem: string }[] = [
  { name: "수원 삼성 블루윙즈", emblem: "suwon_samsung_bluewings" },
  { name: "대구 FC", emblem: "daegu_fc" },
  { name: "수원 FC", emblem: "suwon_fc" },
  { name: "서울 이랜드 FC", emblem: "seoul_e_land_fc" },
  { name: "성남 FC", emblem: "seongname_fc" },
  { name: "전남 드래곤즈", emblem: "jeonnam_dragons" },
  { name: "김포 FC", emblem: "gimpo_fc" },
  { name: "부산 아이파크", emblem: "busan_ipark" },
  { name: "충남 아산 FC", emblem: "chungnam_asan_fc" },
  { name: "화성 FC", emblem: "hwaseong_fc" },
  { name: "경남 FC", emblem: "gyeongnam_fc" },
  { name: "충북 청주 FC", emblem: "cheongju_fc" },
  { name: "천안 시티 FC", emblem: "cheonan_city_fc" },
  { name: "안산 그리너스 FC", emblem: "ansan_greeners_fc" },
  { name: "김해 FC 2008", emblem: "gimhae_fc_2008" },
  { name: "파주 프런티어 FC", emblem: "paju_frontier_fc" },
  { name: "용인 FC", emblem: "yongin_fc" },
]

// MATCH_SCHEDULE.md 1라운드 — 팀 약칭 → TEAM_LIST.md 정확한 팀명에 대응하는 emblem 키
const K1_SHORT_TO_EMBLEM: Record<string, string> = {
  인천: "incheon_united_fc",
  서울: "fc_seoul",
  울산: "ulsan_hd_fc",
  강원: "gangwon_fc",
  김천: "gimcheon_sangmu_fc",
  포항: "pohang_steelers",
  전북: "jeonbuk_hyundai_motors",
  부천: "bucheon_fc_1995",
  제주: "jeju_sk_fc",
  광주: "gwangju_fc",
  대전: "daejeon_hana_citizen",
  안양: "fc_anyang",
}
const K2_SHORT_TO_EMBLEM: Record<string, string> = {
  김해: "gimhae_fc_2008",
  안산: "ansan_greeners_fc",
  수원삼성: "suwon_samsung_bluewings",
  서울이랜드: "seoul_e_land_fc",
  대구: "daegu_fc",
  화성: "hwaseong_fc",
  용인: "yongin_fc",
  천안: "cheonan_city_fc",
  충북청주: "cheongju_fc",
  수원FC: "suwon_fc",
  경남: "gyeongnam_fc",
  전남: "jeonnam_dragons",
  충남아산: "chungnam_asan_fc",
  파주: "paju_frontier_fc",
  부산: "busan_ipark",
  성남: "seongname_fc",
}

// MATCH_SCHEDULE.md 1라운드 (home/away는 위 SHORT 매핑으로 팀 조회)
const K1_ROUND1_MATCHES: { home: string; away: string; date: string; stadium: string }[] = [
  { home: "인천", away: "서울", date: "2026-02-28T14:00:00Z", stadium: "인천축구전용" },
  { home: "울산", away: "강원", date: "2026-02-28T14:00:00Z", stadium: "울산문수" },
  { home: "김천", away: "포항", date: "2026-02-28T16:30:00Z", stadium: "김천종합" },
  { home: "전북", away: "부천", date: "2026-03-01T14:00:00Z", stadium: "전주월드컵" },
  { home: "제주", away: "광주", date: "2026-03-01T16:30:00Z", stadium: "제주월드컵" },
  { home: "대전", away: "안양", date: "2026-03-02T14:00:00Z", stadium: "대전월드컵" },
]
const K2_ROUND1_MATCHES: { home: string; away: string; date: string; stadium: string }[] = [
  { home: "김해", away: "안산", date: "2026-02-28T14:00:00Z", stadium: "김해종합" },
  { home: "수원삼성", away: "서울이랜드", date: "2026-02-28T16:30:00Z", stadium: "수원월드컵" },
  { home: "대구", away: "화성", date: "2026-03-01T14:00:00Z", stadium: "대구iM뱅크" },
  { home: "용인", away: "천안", date: "2026-03-01T14:00:00Z", stadium: "용인미르" },
  { home: "충북청주", away: "수원FC", date: "2026-03-01T16:30:00Z", stadium: "청주종합" },
  { home: "경남", away: "전남", date: "2026-03-01T16:30:00Z", stadium: "창원센터" },
  { home: "충남아산", away: "파주", date: "2026-03-02T14:00:00Z", stadium: "아산이순신" },
  { home: "부산", away: "성남", date: "2026-03-02T16:30:00Z", stadium: "부산구덕" },
]

/** REFEREE_LINK.md에서 [이름](url) 또는 [이름](<url>) 추출 */
function parseRefereeLinks(markdown: string): { name: string; link: string }[] {
  const list: { name: string; link: string }[] = []
  // [이름](<url>) 또는 [이름](url) 둘 다 처리 (url 안에 ) 가 있는 경우 꺾쇠 사용)
  const re = /\[([^\]]+)\]\((?:<([^>]+)>|([^)]+))\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    const link = (m[2] ?? m[3] ?? "").trim()
    if (link) list.push({ name: m[1].trim(), link })
  }
  return list
}

async function main() {
  console.log("Seeding reference data...")

  // -------------------------------------------------------------------------
  // Season (year 기준, League 생성 전에 필요)
  // -------------------------------------------------------------------------
  const season2026 = await prisma.season.upsert({
    where: { year: 2026 },
    update: {},
    create: { year: 2026 },
  })
  console.log("Season:", season2026.year)

  // -------------------------------------------------------------------------
  // League (seasonId + slug unique)
  // -------------------------------------------------------------------------
  const k1 = await prisma.league.upsert({
    where: { seasonId_slug: { seasonId: season2026.id, slug: "kleague1" } } as unknown as Parameters<typeof prisma.league.upsert>[0]["where"],
    update: {},
    create: { name: "K League 1", slug: "kleague1", seasonId: season2026.id } as unknown as Parameters<typeof prisma.league.upsert>[0]["create"],
  })
  const k2 = await prisma.league.upsert({
    where: { seasonId_slug: { seasonId: season2026.id, slug: "kleague2" } } as unknown as Parameters<typeof prisma.league.upsert>[0]["where"],
    update: {},
    create: { name: "K League 2", slug: "kleague2", seasonId: season2026.id } as unknown as Parameters<typeof prisma.league.upsert>[0]["create"],
  })
  const supercup = await prisma.league.upsert({
    where: { seasonId_slug: { seasonId: season2026.id, slug: "supercup" } } as unknown as Parameters<typeof prisma.league.upsert>[0]["where"],
    update: {},
    create: { name: "K League Super Cup", slug: "supercup", seasonId: season2026.id } as unknown as Parameters<typeof prisma.league.upsert>[0]["create"],
  })
  console.log("Leagues:", (k1 as unknown as { slug: string }).slug, (k2 as unknown as { slug: string }).slug, (supercup as unknown as { slug: string }).slug)

  // -------------------------------------------------------------------------
  // Teams (name unique, slug = league-slug + emblem 키, emblemPath)
  // -------------------------------------------------------------------------
  const slugForTeam = (leagueSlug: string, emblemKey: string) => `${leagueSlug}-${emblemKey}`
  const teamK1: Record<string, { id: string }> = {}
  for (const t of K1_TEAMS) {
    const teamSlug = slugForTeam("kleague1", t.emblem)
    const team = await prisma.team.upsert({
      where: { name: t.name },
      update: { slug: teamSlug, emblemPath: EMBLEM("kleague1", t.emblem) } as { slug: string; emblemPath: string },
      create: {
        name: t.name,
        slug: teamSlug,
        emblemPath: EMBLEM("kleague1", t.emblem),
        leagues: { connect: { id: k1.id } },
      } as { name: string; slug: string; emblemPath: string; leagues: { connect: { id: string } } },
    })
    teamK1[t.emblem] = { id: team.id }
  }
  const teamK2: Record<string, { id: string }> = {}
  for (const t of K2_TEAMS) {
    const teamSlug = slugForTeam("kleague2", t.emblem)
    const team = await prisma.team.upsert({
      where: { name: t.name },
      update: { slug: teamSlug, emblemPath: EMBLEM("kleague2", t.emblem) } as { slug: string; emblemPath: string },
      create: {
        name: t.name,
        slug: teamSlug,
        emblemPath: EMBLEM("kleague2", t.emblem),
        leagues: { connect: { id: k2.id } },
      } as { name: string; slug: string; emblemPath: string; leagues: { connect: { id: string } } },
    })
    teamK2[t.emblem] = { id: team.id }
  }
  console.log("Teams: K1", K1_TEAMS.length, ", K2", K2_TEAMS.length)

  // -------------------------------------------------------------------------
  // Rounds (leagueId_number unique, isFocus: 1라운드=false, 5라운드=true)
  // -------------------------------------------------------------------------
  const now = new Date()
  const round5Start = new Date(now)
  round5Start.setDate(round5Start.getDate() - 2)
  const round5End = new Date(now)
  round5End.setDate(round5End.getDate() + 5)

  const roundSlug = (n: number) => `round-${n}`
  const k1Round1 = await prisma.round.upsert({
    where: { leagueId_number: { leagueId: k1.id, number: 1 } } as unknown as Parameters<typeof prisma.round.upsert>[0]["where"],
    update: { isFocus: false, slug: roundSlug(1) } as unknown as Parameters<typeof prisma.round.upsert>[0]["update"],
    create: { leagueId: k1.id, number: 1, slug: roundSlug(1), isFocus: false } as unknown as Parameters<typeof prisma.round.upsert>[0]["create"],
  })
  const k2Round1 = await prisma.round.upsert({
    where: { leagueId_number: { leagueId: k2.id, number: 1 } } as unknown as Parameters<typeof prisma.round.upsert>[0]["where"],
    update: { isFocus: false, slug: roundSlug(1) } as unknown as Parameters<typeof prisma.round.upsert>[0]["update"],
    create: { leagueId: k2.id, number: 1, slug: roundSlug(1), isFocus: false } as unknown as Parameters<typeof prisma.round.upsert>[0]["create"],
  })

  const r1 = await prisma.round.upsert({
    where: { leagueId_number: { leagueId: k1.id, number: 5 } } as unknown as Parameters<typeof prisma.round.upsert>[0]["where"],
    update: { isFocus: true, slug: roundSlug(5) } as unknown as Parameters<typeof prisma.round.upsert>[0]["update"],
    create: { leagueId: k1.id, number: 5, slug: roundSlug(5), isFocus: true } as unknown as Parameters<typeof prisma.round.upsert>[0]["create"],
  })
  await prisma.round.upsert({
    where: { leagueId_number: { leagueId: k2.id, number: 5 } } as unknown as Parameters<typeof prisma.round.upsert>[0]["where"],
    update: { isFocus: true, slug: roundSlug(5) } as unknown as Parameters<typeof prisma.round.upsert>[0]["update"],
    create: { leagueId: k2.id, number: 5, slug: roundSlug(5), isFocus: true } as unknown as Parameters<typeof prisma.round.upsert>[0]["create"],
  })

  // K League Super Cup 2026 (전북 vs 대전, 2026-02-21 14:00 전주 월드컵)
  const supercupRound = await prisma.round.upsert({
    where: { leagueId_number: { leagueId: supercup.id, number: 1 } } as unknown as Parameters<typeof prisma.round.upsert>[0]["where"],
    update: { slug: roundSlug(1) } as unknown as Parameters<typeof prisma.round.upsert>[0]["update"],
    create: { leagueId: supercup.id, number: 1, slug: roundSlug(1), isFocus: false } as unknown as Parameters<typeof prisma.round.upsert>[0]["create"],
  })
  const supercupMatchCount = await prisma.match.count({ where: { roundId: supercupRound.id } })
  if (supercupMatchCount === 0) {
    await prisma.match.create({
      data: {
        roundId: supercupRound.id,
        roundOrder: 1,
        homeTeamId: teamK1.jeonbuk_hyundai_motors.id,
        awayTeamId: teamK1.daejeon_hana_citizen.id,
        playedAt: new Date("2026-02-21T05:00:00.000Z"), // 14:00 KST
        venue: "전주 월드컵경기장",
        status: "SCHEDULED",
      } as unknown as Parameters<typeof prisma.match.create>[0]["data"],
    })
    console.log("Match: K League Super Cup 2026 — 전북 현대 모터스 vs 대전 하나 시티즌 (2026-02-21 14:00)")
  }

  console.log("Rounds: K1/K2 R1 (isFocus=false), K1/K2 R5 (isFocus=true), Super Cup R1")

  // -------------------------------------------------------------------------
  // Matches — 1라운드: MATCH_SCHEDULE.md (K1 6경기, K2 8경기), 5라운드: 샘플 3경기
  // -------------------------------------------------------------------------
  const k1Round1MatchCount = await prisma.match.count({ where: { roundId: k1Round1.id } })
  if (k1Round1MatchCount === 0) {
    for (let i = 0; i < K1_ROUND1_MATCHES.length; i++) {
      const m = K1_ROUND1_MATCHES[i]
      const homeEmblem = K1_SHORT_TO_EMBLEM[m.home]
      const awayEmblem = K1_SHORT_TO_EMBLEM[m.away]
      if (!homeEmblem || !awayEmblem) throw new Error(`K1 team not found: ${m.home} / ${m.away}`)
      await prisma.match.create({
        data: {
          roundId: k1Round1.id,
          roundOrder: i + 1,
          homeTeamId: teamK1[homeEmblem].id,
          awayTeamId: teamK1[awayEmblem].id,
          playedAt: new Date(m.date),
          venue: m.stadium,
          status: "SCHEDULED",
        } as unknown as Parameters<typeof prisma.match.create>[0]["data"],
      })
    }
    console.log("Matches: K1 Round 1,", K1_ROUND1_MATCHES.length, "from MATCH_SCHEDULE.md")
  }

  const k2Round1MatchCount = await prisma.match.count({ where: { roundId: k2Round1.id } })
  if (k2Round1MatchCount === 0) {
    for (let i = 0; i < K2_ROUND1_MATCHES.length; i++) {
      const m = K2_ROUND1_MATCHES[i]
      const homeEmblem = K2_SHORT_TO_EMBLEM[m.home]
      const awayEmblem = K2_SHORT_TO_EMBLEM[m.away]
      if (!homeEmblem || !awayEmblem) throw new Error(`K2 team not found: ${m.home} / ${m.away}`)
      await prisma.match.create({
        data: {
          roundId: k2Round1.id,
          roundOrder: i + 1,
          homeTeamId: teamK2[homeEmblem].id,
          awayTeamId: teamK2[awayEmblem].id,
          playedAt: new Date(m.date),
          venue: m.stadium,
          status: "SCHEDULED",
        } as unknown as Parameters<typeof prisma.match.create>[0]["data"],
      })
    }
    console.log("Matches: K2 Round 1,", K2_ROUND1_MATCHES.length, "from MATCH_SCHEDULE.md")
  }

  const existingMatches = await prisma.match.findMany({
    where: { roundId: r1.id },
    take: 1,
  })
  if (existingMatches.length === 0) {
    await prisma.match.create({
      data: {
        roundId: r1.id,
        roundOrder: 1,
        homeTeamId: teamK1.fc_seoul.id,
        awayTeamId: teamK1.ulsan_hd_fc.id,
        playedAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        venue: "서울 월드컵경기장",
        status: "SCHEDULED",
      } as unknown as Parameters<typeof prisma.match.create>[0]["data"],
    })
    await prisma.match.create({
      data: {
        roundId: r1.id,
        roundOrder: 2,
        homeTeamId: teamK1.incheon_united_fc.id,
        awayTeamId: teamK1.bucheon_fc_1995.id,
        playedAt: new Date(now.getTime() - 60 * 60 * 1000),
        venue: "인천축구전용경기장",
        status: "LIVE",
        scoreHome: 1,
        scoreAway: 0,
      } as unknown as Parameters<typeof prisma.match.create>[0]["data"],
    })
    await prisma.match.create({
      data: {
        roundId: r1.id,
        roundOrder: 3,
        homeTeamId: teamK1.jeonbuk_hyundai_motors.id,
        awayTeamId: teamK1.gwangju_fc.id,
        playedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        venue: "전주월드컵경기장",
        status: "FINISHED",
        scoreHome: 2,
        scoreAway: 1,
      } as unknown as Parameters<typeof prisma.match.create>[0]["data"],
    })
    console.log("Matches: K1 Round 5, 3 sample matches created")
  } else {
    console.log("Matches: K1 Round 5, using existing")
  }

  // -------------------------------------------------------------------------
  // Referees (REFEREE_LINK.md 파싱, name+link 멱등 upsert)
  // -------------------------------------------------------------------------
  let refereeList: { name: string; link: string }[] = []
  try {
    const path = join(process.cwd(), "app", "assets", "docs", "REFEREE_LINK.md")
    const content = readFileSync(path, "utf-8")
    refereeList = parseRefereeLinks(content)
  } catch (e) {
    console.warn("REFEREE_LINK.md not found or unreadable, skipping referees:", e)
  }

  let refCount = 0
  for (const { name, link } of refereeList) {
    const existing = await prisma.referee.findFirst({ where: { name } })
    if (existing) {
      await prisma.referee.update({
        where: { id: existing.id },
        data: { link },
      })
    } else {
      const created = await prisma.referee.create({
        data: { name, link, slug: `ref-${refCount}-${Date.now()}` } as { name: string; link: string | null; slug: string },
      })
      await prisma.referee.update({
        where: { id: created.id },
        data: { slug: created.id } as { slug: string },
      })
    }
    refCount++
  }
  console.log("Referees:", refCount, "from REFEREE_LINK.md (name + link)")

  // -------------------------------------------------------------------------
  // MatchReferee (샘플: LIVE/FINISHED 경기에 심판 배정, REFEREE_LINK에 있는 이름 사용)
  // -------------------------------------------------------------------------
  const liveMatch = await prisma.match.findFirst({
    where: { roundId: r1.id, status: "LIVE" },
  })
  const finishedMatch = await prisma.match.findFirst({
    where: { roundId: r1.id, status: "FINISHED" },
  })
  const ref고형진 = await prisma.referee.findFirst({ where: { name: "고형진" } })
  const ref설태환 = await prisma.referee.findFirst({ where: { name: "설태환" } })
  const ref채상협 = await prisma.referee.findFirst({ where: { name: "채상협" } })
  if (liveMatch && ref고형진 && ref설태환) {
    const existing = await prisma.matchReferee.findFirst({
      where: { matchId: liveMatch.id },
    })
    if (!existing) {
      await prisma.matchReferee.create({
        data: { matchId: liveMatch.id, refereeId: ref고형진.id, role: "MAIN" },
      })
      await prisma.matchReferee.create({
        data: { matchId: liveMatch.id, refereeId: ref설태환.id, role: "VAR" as const },
      })
    }
  }
  if (finishedMatch && ref채상협) {
    const existing = await prisma.matchReferee.findFirst({
      where: { matchId: finishedMatch.id },
    })
    if (!existing) {
      await prisma.matchReferee.create({
        data: { matchId: finishedMatch.id, refereeId: ref채상협.id, role: "MAIN" },
      })
    }
  }
  console.log("MatchReferees: sample assignments (고형진, 설태환, 채상협)")

  // -------------------------------------------------------------------------
  // Moments (경기별 유저 생성 VAR 모멘트 — 홈 핫모멘트·moments 게시판용)
  // Moment 테이블이 없으면(P2021) 스킵. 먼저 npx prisma db push 실행 후 시드 다시 실행.
  // -------------------------------------------------------------------------
  try {
    const momentCount = await prisma.moment.count()
    if (momentCount === 0) {
      const matchesForMoments = await prisma.match.findMany({
        take: 6,
        include: { homeTeam: true, awayTeam: true, round: { include: { league: true } } },
      })
      const samples: { startMinute: number; endMinute: number; seeVarCount: number; commentCount: number }[] = [
        { startMinute: 52, endMinute: 54, seeVarCount: 1240, commentCount: 24 },
        { startMinute: 24, endMinute: 26, seeVarCount: 980, commentCount: 18 },
        { startMinute: 15, endMinute: 18, seeVarCount: 850, commentCount: 12 },
        { startMinute: 82, endMinute: 85, seeVarCount: 720, commentCount: 31 },
        { startMinute: 40, endMinute: 42, seeVarCount: 640, commentCount: 15 },
        { startMinute: 10, endMinute: 12, seeVarCount: 520, commentCount: 9 },
      ]
      for (let i = 0; i < matchesForMoments.length; i++) {
        const m = matchesForMoments[i]
        const s = samples[i % samples.length]
        await prisma.moment.create({
          data: {
            matchId: m.id,
            title: `${s.startMinute}' ~ ${s.endMinute}'`,
            startMinute: s.startMinute,
            endMinute: s.endMinute,
            seeVarCount: s.seeVarCount,
            commentCount: s.commentCount,
          },
        })
        if (i < 3) {
          await prisma.moment.create({
            data: {
              matchId: m.id,
              title: `${s.startMinute + 10}' ~ ${s.endMinute + 10}'`,
              startMinute: s.startMinute + 10,
              endMinute: s.endMinute + 10,
              seeVarCount: Math.floor(s.seeVarCount * 0.6),
              commentCount: Math.floor(s.commentCount * 0.7),
            },
          })
        }
      }
      console.log("Moments: sample moments for matches (hot moments + board)")
    }
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "P2021") {
      console.warn(
        "Moment table not found. Run: npx prisma db push  (ensure .env has DATABASE_URL), then npm run db:seed again."
      )
    } else {
      throw e
    }
  }

  console.log("Seed completed.")
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
