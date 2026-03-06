/**
 * 기존 작성 글·닉네임 검수 스크립트
 *
 * 사용:
 *   npx tsx scripts/audit-content.ts                    # 검사만, 결과를 stdout + report 파일로 출력
 *   npx tsx scripts/audit-content.ts --export=out.json  # 결과를 지정 파일로 저장
 *   npx tsx scripts/audit-content.ts --apply            # 위반 댓글/한줄평을 UNDER_REVIEW로 변경
 *   npx tsx scripts/audit-content.ts --no-content       # 닉네임만 검사
 *   npx tsx scripts/audit-content.ts --no-content --rename-nicknames  # 닉네임만 검사 + 위반 시 케이리그화이팅1,2,3... 으로 변경
 *
 * 환경: .env 또는 DATABASE_URL 필요. 닉네임 검사 시 OPENAI_API_KEY 필요(rate limit 고려해 요청 간 지연 있음).
 */
import "../lib/database-url"
import { prisma } from "@/lib/prisma"
import { runAuditContent } from "@/lib/jobs/audit-content"
import * as fs from "fs"
import * as path from "path"

async function main() {
  const args = process.argv.slice(2)
  const exportPath = args.find((a) => a.startsWith("--export="))?.slice("--export=".length)
  const apply = args.includes("--apply")
  const skipNicknames = args.includes("--no-nicknames")
  const skipContent = args.includes("--no-content")
  const renameNicknames = args.includes("--rename-nicknames")

  console.log("[검수] 시작...")
  const report = await runAuditContent({
    apply,
    skipNicknames,
    skipContent,
    renameViolatingNicknames: renameNicknames,
  })

  const total =
    report.summary.nicknames +
    report.summary.comments +
    report.summary.reviews +
    report.summary.replies +
    report.summary.moments

  console.log("\n--- 요약 ---")
  console.log(JSON.stringify(report.summary, null, 2))
  console.log(`총 위반: ${total}건`)

  const outPath = exportPath ?? path.join(process.cwd(), `audit-report-${report.at.slice(0, 10)}.json`)
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8")
  console.log(`\n보고서 저장: ${outPath}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
