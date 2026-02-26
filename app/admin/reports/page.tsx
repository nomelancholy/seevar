import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminReportList } from "./AdminReportList"

export const metadata = {
  title: "신고·유저 | 관리자 | See VAR",
  description: "신고 접수 유저 조치 및 관리",
}

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      review: {
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          referee: { select: { name: true } },
        },
      },
      comment: {
        select: {
          id: true,
          content: true,
          status: true,
          moment: { select: { id: true, title: true } },
        },
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
        신고·유저
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        신고된 댓글·심판 평가를 검토하고 숨김 처리할 수 있습니다.
      </p>
      <AdminReportList reports={reports} />
    </main>
  )
}
