import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ChevronLeft, Plus, Settings } from "lucide-react"

export const metadata = {
  title: "공지 | See VAR",
  description: "사이트 운영 공지",
}

export default async function NoticeListPage() {
  const user = await getCurrentUser()
  const isAdmin = getIsAdmin(user)

  const notices = await prisma.notice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
    },
  })

  return (
    <main className="max-w-4xl mx-auto py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          BACK
        </Link>
      </div>

      <header className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
            공지
          </h1>
          <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
            사이트 운영에 대한 공지입니다.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 border border-border bg-muted/50 text-muted-foreground px-4 py-2 font-mono text-xs font-bold uppercase hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="size-4" />
              관리자 페이지
            </Link>
            <Link
              href="/notice/new"
              className="inline-flex items-center gap-2 border border-primary bg-primary/10 text-primary px-4 py-2 font-mono text-xs font-bold uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="size-4" />
              공지 작성
            </Link>
          </div>
        )}
      </header>

      <div className="space-y-0 border border-border bg-card/30">
        {notices.length === 0 ? (
          <div className="p-8 md:p-12 text-center font-mono text-sm text-muted-foreground">
            등록된 공지가 없습니다.
          </div>
        ) : (
          notices.map((n) => (
            <Link
              key={n.id}
              href={`/notice/${n.number}`}
              className="block p-4 md:p-6 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
            >
              <h2 className="font-bold text-base md:text-lg mb-1">{n.title}</h2>
              <p className="font-mono text-[10px] md:text-xs text-muted-foreground">
                {n.author.name ?? "운영자"} ·{" "}
                {new Date(n.createdAt).toLocaleDateString("ko-KR")}
                {!n.allowComments && " · 댓글 비허용"}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
