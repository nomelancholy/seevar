import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminRefereeList } from "./AdminRefereeList"

export const metadata = {
  title: "심판 정보 | 관리자 | See VAR",
  description: "심판 정보 등록·수정·삭제",
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
        심판을 등록·수정·삭제할 수 있습니다. 배정된 경기가 있는 심판은 삭제할 수 없습니다.
      </p>
      <AdminRefereeList referees={referees} />
    </main>
  )
}
