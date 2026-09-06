import "../lib/database-url";
import {
  MatchStatus,
  PrismaClient,
  RefereeRole,
} from "@prisma/client";

const prisma = new PrismaClient();

type SampleMatch = {
  home: string;
  away: string;
  playedAt: string;
  venue: string;
  status: MatchStatus;
  scoreHome: number;
  scoreAway: number;
};

type SampleLeague = {
  name: string;
  slug: string;
  roundNumber: number;
  teams: string[];
  refereeNames: string[];
  matches: SampleMatch[];
};

// 2026-09-06 운영 일정 스냅샷을 바탕으로 만든 로컬 UI 검증용 데이터입니다.
const SAMPLE_LEAGUES: SampleLeague[] = [
  {
    name: "K리그1",
    slug: "k-league-1",
    roundNumber: 27,
    teams: [
      "울산 HD FC",
      "강원 FC",
      "FC 서울",
      "포항 스틸러스",
      "전북 현대 모터스",
      "대전 하나 시티즌",
      "김천 상무 FC",
      "제주 SK FC",
      "인천 유나이티드",
      "광주 FC",
      "FC 안양",
      "부천 FC 1995",
    ],
    refereeNames: [
      "고형진",
      "곽승순",
      "구은석",
      "김대용",
      "김우성",
      "김종혁",
      "김계용",
      "김지욱",
      "박병진",
      "김태형",
      "박균용",
      "설태환",
    ],
    matches: [
      { home: "부천 FC 1995", away: "대전 하나 시티즌", playedAt: "2026-09-05T10:00:00.000Z", venue: "부천 종합운동장", status: MatchStatus.FINISHED, scoreHome: 0, scoreAway: 5 },
      { home: "FC 서울", away: "인천 유나이티드", playedAt: "2026-09-05T10:00:00.000Z", venue: "서울 월드컵 경기장", status: MatchStatus.FINISHED, scoreHome: 1, scoreAway: 0 },
      { home: "전북 현대 모터스", away: "포항 스틸러스", playedAt: "2026-09-05T10:00:00.000Z", venue: "전주 월드컵 경기장", status: MatchStatus.FINISHED, scoreHome: 2, scoreAway: 0 },
      { home: "제주 SK FC", away: "울산 HD FC", playedAt: "2026-09-05T10:00:00.000Z", venue: "제주 월드컵 경기장", status: MatchStatus.FINISHED, scoreHome: 0, scoreAway: 0 },
      { home: "FC 안양", away: "강원 FC", playedAt: "2026-09-06T10:00:00.000Z", venue: "안양 종합운동장", status: MatchStatus.SCHEDULED, scoreHome: 0, scoreAway: 0 },
      { home: "김천 상무 FC", away: "광주 FC", playedAt: "2026-09-06T10:00:00.000Z", venue: "김천 종합운동장", status: MatchStatus.SCHEDULED, scoreHome: 0, scoreAway: 0 },
    ],
  },
  {
    name: "K리그2",
    slug: "k-league-2",
    roundNumber: 25,
    teams: [
      "수원 삼성 블루윙즈",
      "대구 FC",
      "수원 FC",
      "서울 이랜드 FC",
      "성남 FC",
      "전남 드래곤즈",
      "김포 FC",
      "부산 아이파크",
      "충남 아산 FC",
      "화성 FC",
      "경남 FC",
      "충북 청주 FC",
      "천안 시티 FC",
      "안산 그리너스 FC",
      "김해 FC 2008",
      "파주 프런티어 FC",
      "용인 FC",
    ],
    refereeNames: [
      "고민국",
      "김수현",
      "김유영",
      "김용우",
      "김재홍",
      "김희곤",
      "김종희",
      "김태원",
      "박세진",
      "김현진",
      "류시홍",
      "박정호",
    ],
    matches: [
      { home: "충북 청주 FC", away: "서울 이랜드 FC", playedAt: "2026-09-04T10:30:00.000Z", venue: "청주 종합 경기장", status: MatchStatus.FINISHED, scoreHome: 0, scoreAway: 2 },
      { home: "파주 프런티어 FC", away: "대구 FC", playedAt: "2026-09-04T10:30:00.000Z", venue: "파주 종합운동장", status: MatchStatus.FINISHED, scoreHome: 0, scoreAway: 0 },
      { home: "부산 아이파크", away: "안산 그리너스 FC", playedAt: "2026-09-05T10:00:00.000Z", venue: "부산 구덕 운동장", status: MatchStatus.FINISHED, scoreHome: 0, scoreAway: 1 },
      { home: "천안 시티 FC", away: "화성 FC", playedAt: "2026-09-05T10:00:00.000Z", venue: "천안 종합운동장", status: MatchStatus.FINISHED, scoreHome: 1, scoreAway: 1 },
      { home: "용인 FC", away: "수원 FC", playedAt: "2026-09-05T10:00:00.000Z", venue: "용인 종합운동장", status: MatchStatus.FINISHED, scoreHome: 1, scoreAway: 1 },
      { home: "김해 FC 2008", away: "전남 드래곤즈", playedAt: "2026-09-05T10:00:00.000Z", venue: "김해 운동장", status: MatchStatus.FINISHED, scoreHome: 2, scoreAway: 2 },
      { home: "수원 삼성 블루윙즈", away: "충남 아산 FC", playedAt: "2026-09-06T10:00:00.000Z", venue: "수원 월드컵 경기장", status: MatchStatus.SCHEDULED, scoreHome: 0, scoreAway: 0 },
      { home: "김포 FC", away: "성남 FC", playedAt: "2026-09-06T10:00:00.000Z", venue: "김포 종합운동장", status: MatchStatus.SCHEDULED, scoreHome: 0, scoreAway: 0 },
    ],
  },
];

function assertLocalDatabase() {
  const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "db"]);
  const dbHost = process.env.DB_HOST ?? "localhost";
  let databaseUrlHost: string | null = null;
  let appHost: string | null = null;

  try {
    databaseUrlHost = process.env.DATABASE_URL
      ? new URL(process.env.DATABASE_URL).hostname
      : null;
  } catch {
    throw new Error("DATABASE_URL 형식이 올바르지 않습니다.");
  }
  try {
    appHost = process.env.NEXTAUTH_URL
      ? new URL(process.env.NEXTAUTH_URL).hostname
      : null;
  } catch {
    throw new Error("NEXTAUTH_URL 형식이 올바르지 않습니다.");
  }

  const host = databaseUrlHost ?? dbHost;
  if (
    process.env.NODE_ENV === "production" ||
    !allowedHosts.has(host) ||
    !appHost ||
    !allowedHosts.has(appHost)
  ) {
    throw new Error(
      `샘플 시드는 로컬 환경에서만 실행할 수 있습니다. DB host=${host}, app host=${appHost ?? "unset"}`,
    );
  }
}

async function findRequired<T extends { name: string }>(
  rows: T[],
  name: string,
  kind: string,
) {
  const row = rows.find((item) => item.name === name);
  if (!row) {
    throw new Error(`${kind} '${name}'을 찾을 수 없습니다. npm run db:seed를 먼저 실행하세요.`);
  }
  return row;
}

async function main() {
  assertLocalDatabase();

  const teams = await prisma.team.findMany();
  const referees = await prisma.referee.findMany();
  if (teams.length === 0 || referees.length === 0) {
    throw new Error("기본 팀·심판 데이터가 없습니다. npm run db:seed를 먼저 실행하세요.");
  }

  const season = await prisma.season.upsert({
    where: { year: 2026 },
    update: {},
    create: { year: 2026 },
  });

  const matchesByKey = new Map<string, { id: string; homeTeamId: string; awayTeamId: string }>();
  const mainRefereeByMatch = new Map<string, string>();

  for (const sampleLeague of SAMPLE_LEAGUES) {
    const leagueTeams = await Promise.all(
      sampleLeague.teams.map((name) => findRequired(teams, name, "팀")),
    );
    const leagueReferees = await Promise.all(
      sampleLeague.refereeNames.map((name) => findRequired(referees, name, "심판")),
    );

    const league = await prisma.league.upsert({
      where: {
        seasonId_slug: { seasonId: season.id, slug: sampleLeague.slug },
      },
      update: {
        name: sampleLeague.name,
        teams: { set: leagueTeams.map(({ id }) => ({ id })) },
      },
      create: {
        name: sampleLeague.name,
        slug: sampleLeague.slug,
        seasonId: season.id,
        teams: { connect: leagueTeams.map(({ id }) => ({ id })) },
      },
    });

    await prisma.round.updateMany({
      where: { leagueId: league.id },
      data: { isFocus: false },
    });
    const round = await prisma.round.upsert({
      where: {
        leagueId_number: {
          leagueId: league.id,
          number: sampleLeague.roundNumber,
        },
      },
      update: { slug: `round-${sampleLeague.roundNumber}`, isFocus: true },
      create: {
        leagueId: league.id,
        number: sampleLeague.roundNumber,
        slug: `round-${sampleLeague.roundNumber}`,
        isFocus: true,
      },
    });

    await prisma.refereeSeason.createMany({
      data: leagueReferees.map(({ id }) => ({ refereeId: id, seasonId: season.id })),
      skipDuplicates: true,
    });

    for (const [index, sampleMatch] of sampleLeague.matches.entries()) {
      const homeTeam = await findRequired(teams, sampleMatch.home, "팀");
      const awayTeam = await findRequired(teams, sampleMatch.away, "팀");
      const match = await prisma.match.upsert({
        where: {
          roundId_roundOrder: { roundId: round.id, roundOrder: index + 1 },
        },
        update: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          playedAt: new Date(sampleMatch.playedAt),
          venue: sampleMatch.venue,
          status: sampleMatch.status,
          scoreHome: sampleMatch.scoreHome,
          scoreAway: sampleMatch.scoreAway,
        },
        create: {
          roundId: round.id,
          roundOrder: index + 1,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          playedAt: new Date(sampleMatch.playedAt),
          venue: sampleMatch.venue,
          status: sampleMatch.status,
          scoreHome: sampleMatch.scoreHome,
          scoreAway: sampleMatch.scoreAway,
        },
      });

      const refereeOffset = (index * 2) % leagueReferees.length;
      const assigned = Array.from({ length: 6 }, (_, position) =>
        leagueReferees[(refereeOffset + position) % leagueReferees.length],
      );
      const roles = [
        RefereeRole.MAIN,
        RefereeRole.ASSISTANT,
        RefereeRole.ASSISTANT,
        RefereeRole.WAITING,
        RefereeRole.VAR,
        RefereeRole.VAR,
      ];

      await prisma.matchReferee.deleteMany({ where: { matchId: match.id } });
      await prisma.matchReferee.createMany({
        data: assigned.map((referee, roleIndex) => ({
          matchId: match.id,
          refereeId: referee.id,
          role: roles[roleIndex],
        })),
      });

      const key = `${sampleLeague.slug}:${sampleLeague.roundNumber}:${index + 1}`;
      matchesByKey.set(key, match);
      mainRefereeByMatch.set(key, assigned[0].id);
    }
  }

  const sampleUsers = await Promise.all(
    [
      { email: "sample-seoul@seevar.local", name: "서울직관러", handle: "sample-seoul", team: "FC 서울" },
      { email: "sample-incheon@seevar.local", name: "파검의목소리", handle: "sample-incheon", team: "인천 유나이티드" },
      { email: "sample-daejeon@seevar.local", name: "대전축구팬", handle: "sample-daejeon", team: "대전 하나 시티즌" },
      { email: "sample-suwon@seevar.local", name: "빅버드N석", handle: "sample-suwon", team: "수원 삼성 블루윙즈" },
    ].map(async (sample) => {
      const team = await findRequired(teams, sample.team, "팀");
      return prisma.user.upsert({
        where: { email: sample.email },
        update: {
          name: sample.name,
          handle: sample.handle,
          supportingTeamId: team.id,
          xp: 120,
        },
        create: {
          email: sample.email,
          name: sample.name,
          handle: sample.handle,
          supportingTeamId: team.id,
          xp: 120,
        },
      });
    }),
  );

  const reviewSamples = [
    { key: "k-league-1:27:1", userIndex: 0, rating: 4.5, comment: "경기 흐름을 잘 살린 판정이었습니다." },
    { key: "k-league-1:27:1", userIndex: 1, rating: 2.5, comment: "후반 경합 장면의 기준은 조금 아쉬웠어요." },
    { key: "k-league-1:27:2", userIndex: 1, rating: 4, comment: "일관된 기준으로 운영한 경기였습니다." },
    { key: "k-league-1:27:3", userIndex: 2, rating: 3, comment: "VAR 확인 과정이 조금 더 명확했으면 좋겠습니다." },
    { key: "k-league-2:25:1", userIndex: 3, rating: 4.5, comment: "선수들과의 소통이 안정적이었습니다." },
    { key: "k-league-2:25:3", userIndex: 3, rating: 2, comment: "카드 기준이 경기 중 달라진 느낌입니다." },
  ];

  for (const sample of reviewSamples) {
    const match = matchesByKey.get(sample.key);
    const refereeId = mainRefereeByMatch.get(sample.key);
    const user = sampleUsers[sample.userIndex];
    if (!match || !refereeId || !user) continue;

    await prisma.refereeReview.upsert({
      where: {
        matchId_refereeId_userId: {
          matchId: match.id,
          refereeId,
          userId: user.id,
        },
      },
      update: {
        rating: sample.rating,
        comment: sample.comment,
        role: RefereeRole.MAIN,
        fanTeamId: user.supportingTeamId,
        status: "VISIBLE",
      },
      create: {
        matchId: match.id,
        refereeId,
        userId: user.id,
        rating: sample.rating,
        comment: sample.comment,
        role: RefereeRole.MAIN,
        fanTeamId: user.supportingTeamId,
        status: "VISIBLE",
      },
    });
  }

  const momentSamples = [
    {
      id: "sample-moment-k1-r27-1",
      key: "k-league-1:27:1",
      userIndex: 2,
      title: "후반 페널티박스 경합 장면",
      description: "수비 과정에서 접촉이 있었던 장면을 다시 확인해 봅니다.",
      period: "second",
      minute: 32,
      absoluteMinute: 77,
      seeVarCount: 18,
      comment: "접촉 강도와 공을 먼저 건드렸는지가 핵심으로 보여요.",
    },
    {
      id: "sample-moment-k1-r27-2",
      key: "k-league-1:27:2",
      userIndex: 1,
      title: "전반 득점 직전 오프사이드 여부",
      description: "패스 시점 공격수 위치를 기준으로 의견을 나눠보세요.",
      period: "first",
      minute: 24,
      absoluteMinute: 24,
      seeVarCount: 11,
      comment: "화면 각도상 동일 선상으로 보이는데 다른 각도도 궁금합니다.",
    },
    {
      id: "sample-moment-k2-r25-1",
      key: "k-league-2:25:1",
      userIndex: 3,
      title: "후반 위험한 태클 카드 수위",
      description: "옐로카드와 퇴장 사이에서 논쟁이 있었던 장면입니다.",
      period: "second",
      minute: 14,
      absoluteMinute: 59,
      seeVarCount: 9,
      comment: "발바닥 노출과 접촉 위치를 보면 강한 제재도 가능해 보여요.",
    },
  ];

  for (const sample of momentSamples) {
    const match = matchesByKey.get(sample.key);
    const user = sampleUsers[sample.userIndex];
    if (!match || !user) continue;

    const moment = await prisma.moment.upsert({
      where: { id: sample.id },
      update: {
        matchId: match.id,
        userId: user.id,
        title: sample.title,
        description: sample.description,
        startPeriod: sample.period,
        startMinuteInPeriod: sample.minute,
        startMinute: sample.absoluteMinute,
        endMinute: sample.absoluteMinute + 2,
        duration: 2,
        seeVarCount: sample.seeVarCount,
        commentCount: 1,
      },
      create: {
        id: sample.id,
        matchId: match.id,
        userId: user.id,
        title: sample.title,
        description: sample.description,
        startPeriod: sample.period,
        startMinuteInPeriod: sample.minute,
        startMinute: sample.absoluteMinute,
        endMinute: sample.absoluteMinute + 2,
        duration: 2,
        seeVarCount: sample.seeVarCount,
        commentCount: 1,
      },
    });

    await prisma.comment.upsert({
      where: { id: `${sample.id}-comment` },
      update: { content: sample.comment, userId: user.id, momentId: moment.id },
      create: {
        id: `${sample.id}-comment`,
        content: sample.comment,
        userId: user.id,
        momentId: moment.id,
      },
    });
  }

  console.log("Sample data ready:");
  console.log("- 2026 K리그1 27라운드: 6경기");
  console.log("- 2026 K리그2 25라운드: 8경기");
  console.log("- 경기별 심판 6명 배정, 샘플 유저 4명, 평가 6개, 쟁점 순간 3개");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
