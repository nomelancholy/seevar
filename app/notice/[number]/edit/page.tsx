import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ChevronLeft } from "lucide-react"
import { NoticeForm } from "../../NoticeForm"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const num = parseInt((await params).number, 10)
  if (Number.isNaN(num)) return { title: "공지 수정 | See VAR" }
  const notice = await prisma.notice.findUnique({
    where: { number: num },
    select: { title: true },
  })
  if (!notice) return { title: "공지 수정 | See VAR" }
  return { title: `${notice.title} 수정 | See VAR` }
}

export default async function NoticeEditPage({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const num = parseInt((await params).number, 10)
  if (Number.isNaN(num)) notFound()

  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!getIsAdmin(user)) redirect("/notice")

  const notice = await prisma.notice.findUnique({
    where: { number: num },
    select: { id: true, number: true, title: true, content: true, allowComments: true, isPinned: true },
  })
  if (!notice) notFound()

  return (
    <main className="max-w-4xl mx-auto py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href={`/notice/${notice.number}`}
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          공지로
        </Link>
      </div>

      <header className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
          공지 수정
        </h1>
      </header>

      <NoticeForm
        noticeId={notice.id}
        noticeNumber={notice.number}
        initialTitle={notice.title}
        initialContent={notice.content}
        initialAllowComments={notice.allowComments}
        initialIsPinned={notice.isPinned}
        mode="edit"
      />
    </main>
  )
}
