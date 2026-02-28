import "../lib/database-url";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

// 엠블럼 경로: public/assets 기준
const EMBLEM = (league: "kleague1" | "kleague2", file: string) =>
  `/assets/emblem/2026/${league}/${file}.svg`;

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
];
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
];

/** REFEREE_LINK.md에서 [이름](url) 또는 [이름](<url>) 추출 */
function parseRefereeLinks(markdown: string): { name: string; link: string }[] {
  const list: { name: string; link: string }[] = [];
  const re = /\[([^\]]+)\]\((?:<([^>]+)>|([^)]+))\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const link = (m[2] ?? m[3] ?? "").trim();
    if (link) list.push({ name: m[1].trim(), link });
  }
  return list;
}

async function main() {
  console.log("Seeding: teams + referees only (팀은 리그와 무관하게 등록).");

  // -------------------------------------------------------------------------
  // Teams (리그와 분리. name unique, slug = emblem. 시즌/리그/라운드/경기는 관리자에서)
  // -------------------------------------------------------------------------
  const allTeams = [
    ...K1_TEAMS.map((t) => ({ ...t, emblemLeague: "kleague1" as const })),
    ...K2_TEAMS.map((t) => ({ ...t, emblemLeague: "kleague2" as const })),
  ];
  for (const t of allTeams) {
    await prisma.team.upsert({
      where: { name: t.name },
      update: {
        slug: t.emblem,
        emblemPath: EMBLEM(t.emblemLeague, t.emblem),
      } as { slug: string; emblemPath: string },
      create: {
        name: t.name,
        slug: t.emblem,
        emblemPath: EMBLEM(t.emblemLeague, t.emblem),
      } as { name: string; slug: string; emblemPath: string },
    });
  }
  console.log("Teams:", allTeams.length, "(리그 소속 없음)");

  // -------------------------------------------------------------------------
  // Referees (REFEREE_LINK.md 파싱, name+link 멱등 upsert)
  // -------------------------------------------------------------------------
  let refereeList: { name: string; link: string }[] = [];
  try {
    const path = join(
      process.cwd(),
      "app",
      "assets",
      "docs",
      "REFEREE_LINK.md",
    );
    const content = readFileSync(path, "utf-8");
    refereeList = parseRefereeLinks(content);
  } catch (e) {
    console.warn(
      "REFEREE_LINK.md not found or unreadable, skipping referees:",
      e,
    );
  }

  const { makeUniqueRefereeSlug } = await import("@/lib/referee-slug");
  const existingSlugs = new Set(
    (await prisma.referee.findMany({ select: { slug: true } })).map(
      (r) => r.slug,
    ),
  );
  let refCount = 0;
  for (const { name, link } of refereeList) {
    const existing = await prisma.referee.findFirst({ where: { name } });
    if (existing) {
      await prisma.referee.update({
        where: { id: existing.id },
        data: { link },
      });
    } else {
      const slug = makeUniqueRefereeSlug(name, existingSlugs);
      existingSlugs.add(slug);
      await prisma.referee.create({
        data: { name, link, slug } as {
          name: string;
          link: string | null;
          slug: string;
        },
      });
      refCount++;
    }
  }
  console.log(
    "Referees:",
    refCount,
    "new from REFEREE_LINK.md (name + link, name-based slug)",
  );

  console.log("Seed completed (teams + referees only).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
