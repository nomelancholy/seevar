import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminRefereeList } from "./AdminRefereeList"

export const metadata = {
  title: "심판 정보 | 관리자 | SEE VAR",
  description: "심판 기본 정보 등록·수정·삭제",
}

export default async function AdminRefereesPage() {
  const referees = await prisma.referee.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { matchReferees: true } },
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
        심판 정보
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        심판 기본 정보를 등록·수정합니다. 시즌별 활동·제외 여부는{" "}
        <Link href="/admin/season-rosters" className="text-primary hover:underline">연도별 소속 관리</Link>에서 설정하세요.
        배정된 경기가 있는 심판은 삭제할 수 없습니다.
      </p>
      <AdminRefereeList referees={referees} />
    </main>
  )
}
