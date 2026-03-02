import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminTeamAddForm } from "./AdminTeamAddForm"
import { AdminBulkTeamUpload } from "../structure/AdminBulkTeamUpload"
import { AdminTeamRow } from "./AdminTeamRow"

export const metadata = {
  title: "팀 정보 | 관리자 | See VAR",
  description: "팀 등록·수정·삭제, JSON 일괄 등록",
}

export default async function AdminTeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { homeMatches: true, awayMatches: true, users: true },
      },
    },
  })

  return (
    <main className="max-w-4xl mx-auto pb-12 md:pb-16">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 관리자
        </Link>
      </div>
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
        팀 정보
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        팀을 등록·수정·삭제할 수 있습니다. JSON 파일로 일괄 등록도 가능합니다. 경기 배정이 있거나 응원팀으로 선택한 유저가 있는 팀은 삭제할 수 없습니다.
      </p>

      <div className="space-y-6">
        <div className="ledger-surface border border-border p-4">
          <AdminTeamAddForm />
        </div>
        <div className="ledger-surface border border-border p-4">
          <AdminBulkTeamUpload />
        </div>
        <div className="ledger-surface border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-3 border-b border-border font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card/50">
            <div className="col-span-3">팀 이름</div>
            <div className="col-span-2">슬러그</div>
            <div className="col-span-4">엠블럼</div>
            <div className="col-span-1 text-center">경기</div>
            <div className="col-span-1 text-center">유저</div>
            <div className="col-span-1 text-right">작업</div>
          </div>
          <div className="divide-y divide-border">
            {teams.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-xs">
                등록된 팀이 없습니다. 위에서 등록하거나 JSON으로 일괄 등록하세요.
              </div>
            ) : (
              teams.map((team) => <AdminTeamRow key={team.id} team={team} />)
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
