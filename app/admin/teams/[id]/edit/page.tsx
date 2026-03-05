import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminTeamEditForm } from "./AdminTeamEditForm"

export const metadata = {
  title: "팀 수정 | 관리자 | SEE VAR",
}

type Params = Promise<{ id: string }>

export default async function AdminTeamEditPage({ params }: { params: Params }) {
  const { id } = await params
  const team = await prisma.team.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, emblemPath: true },
  })
  if (!team) notFound()

  return (
    <main className="max-w-2xl mx-auto pb-12">
      <div className="mb-6">
        <Link
          href="/admin/teams"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 팀 목록
        </Link>
      </div>
      <h2 className="text-xl font-black uppercase tracking-tighter mb-2">팀 수정</h2>
      <AdminTeamEditForm
        teamId={team.id}
        initialName={team.name}
        initialSlug={team.slug ?? ""}
        initialEmblemPath={team.emblemPath ?? ""}
      />
    </main>
  )
}
