/**
 * 2026 슈퍼컵 1라운드 전북 vs 대전 경기
 * - 결과: 전북 2 : 0 대전 (FINISHED)
 * - 주심: 고형진
 * - 부심: 김계용, 윤재열
 * - 대기심: 오현진
 * - VAR: 김종혁, 박세진
 *
 * 실행: npx tsx scripts/seed-supercup-2026-referees.ts
 */
import "../lib/database-url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REFEREES = [
  { name: "고형진", role: "MAIN" as const },
  { name: "김계용", role: "ASSISTANT" as const },
  { name: "윤재열", role: "ASSISTANT" as const },
  { name: "오현진", role: "WAITING" as const },
  { name: "김종혁", role: "VAR" as const },
  { name: "박세진", role: "VAR" as const },
];

async function main() {
  const season = await prisma.season.findUnique({ where: { year: 2026 } });
  if (!season) {
    throw new Error("Season 2026 not found. Run db:seed first.");
  }

  const league = await prisma.league.findFirst({
    where: { seasonId: season.id, slug: "supercup" },
  });
  if (!league) {
    throw new Error("Super Cup league not found. Run db:seed first.");
  }

  const round = await prisma.round.findFirst({
    where: { leagueId: league.id, number: 1 },
  });
  if (!round) {
    throw new Error("Super Cup Round 1 not found. Run db:seed first.");
  }

  let match = await prisma.match.findFirst({
    where: { roundId: round.id, roundOrder: 1 },
  });

  if (!match) {
    const homeTeam = await prisma.team.findFirst({
      where: { name: "전북 현대 모터스" },
    });
    const awayTeam = await prisma.team.findFirst({
      where: { name: "대전 하나 시티즌" },
    });
    if (!homeTeam || !awayTeam) {
      throw new Error(
        "Teams 전북 현대 모터스 / 대전 하나 시티즌 not found. Run db:seed first.",
      );
    }
    match = await prisma.match.create({
      data: {
        roundId: round.id,
        roundOrder: 1,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        playedAt: new Date("2026-02-21T05:00:00.000Z"),
        venue: "전주 월드컵경기장",
        status: "FINISHED",
        scoreHome: 2,
        scoreAway: 0,
      },
    });
    console.log("Match created: Super Cup R1 전북 vs 대전 (2 : 0)");
  } else {
    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: "FINISHED",
        scoreHome: 2,
        scoreAway: 0,
      },
    });
    console.log("Match updated: FINISHED, 2 : 0 (전북 vs 대전)");
  }

  // 심판 조회 (이름으로, REFEREE_LINK.md 시드 후 존재해야 함)
  const refereeIds: {
    id: string;
    name: string;
    role: "MAIN" | "ASSISTANT" | "VAR" | "WAITING";
  }[] = [];
  for (const { name, role } of REFEREES) {
    const ref = await prisma.referee.findFirst({ where: { name } });
    if (!ref) {
      throw new Error(
        `Referee "${name}" not found. Run db:seed (REFEREE_LINK.md) first.`,
      );
    }
    refereeIds.push({ id: ref.id, name: ref.name, role });
  }

  // MatchReferee 삽입 (이미 있으면 스킵)
  for (const { id: refereeId, name, role } of refereeIds) {
    const existing = await prisma.matchReferee.findUnique({
      where: {
        matchId_refereeId_role: { matchId: match.id, refereeId, role },
      },
    });
    if (!existing) {
      await prisma.matchReferee.create({
        data: { matchId: match.id, refereeId, role },
      });
      console.log("  MatchReferee:", role, name);
    }
  }
  console.log("Super Cup 2026 R1 referee assignments done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
