import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminStructureForms } from "../matches/AdminStructureForms"
import { AdminStructureList } from "./AdminStructureList"
import { AdminBulkTeamUpload } from "./AdminBulkTeamUpload"

export const metadata = {
  title: "시즌·리그·라운드 관리 | 관리자 | See VAR",
  description: "시즌, 리그, 라운드 추가 및 구조 관리",
}

export default async function AdminStructurePage() {
  const seasonsWithStructure = await prisma.season.findMany({
    orderBy: { year: "desc" },
    include: {
      leagues: {
        orderBy: { slug: "asc" },
        include: {
          rounds: {
            orderBy: { number: "asc" },
            include: { _count: { select: { matches: true } } },
          },
        },
      },
    },
  })

  return (
    <main className="max-w-4xl mx-auto pb-12 md:pb-16">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 관리자
        </Link>
      </div>
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
        시즌 · 리그 · 라운드 관리
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        시즌(연도), 리그, 라운드를 추가합니다. 경기 일정은 경기 일정 메뉴에서 관리하세요.
      </p>

      {/* 팀 정보 JSON 일괄 등록 */}
      <section className="mb-8">
        <AdminBulkTeamUpload />
      </section>

      {/* 현재 등록된 시즌·리그·라운드 목록 (수정/삭제/포커스 설정) */}
      <section className="mb-8 p-4 border border-border bg-card">
        <h3 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-4">
          등록된 시즌 · 리그 · 라운드
        </h3>
        <AdminStructureList seasons={seasonsWithStructure} />
      </section>

      <AdminStructureForms />
    </main>
  )
}
