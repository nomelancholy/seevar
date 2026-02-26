import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminRefereeEditForm } from "./AdminRefereeEditForm"

export const metadata = {
  title: "심판 수정 | 관리자 | See VAR",
}

type Params = Promise<{ id: string }>

export default async function AdminRefereeEditPage({ params }: { params: Params }) {
  const { id } = await params
  const referee = await prisma.referee.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, link: true },
  })
  if (!referee) notFound()

  return (
    <main className="max-w-2xl mx-auto pb-12">
      <div className="mb-6">
        <Link
          href="/admin/referees"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 심판 목록
        </Link>
      </div>
      <h2 className="text-xl font-black uppercase tracking-tighter mb-2">심판 수정</h2>
      <AdminRefereeEditForm
        refereeId={referee.id}
        initialName={referee.name}
        initialSlug={referee.slug}
        initialLink={referee.link ?? ""}
      />
    </main>
  )
}
