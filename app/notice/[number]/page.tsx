import Link from "next/link"
import { notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ChevronLeft } from "lucide-react"
import { NoticeDeleteButton } from "./NoticeDeleteButton"
import { NoticeCommentSection } from "./NoticeCommentSection"
import { NoticeContentWithAttachments } from "./NoticeContentWithAttachments"

/** 배포 후에도 항상 최신 공지·댓글을 DB에서 가져오도록 정적 캐시 비활성화 */
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const num = parseInt((await params).number, 10)
  if (Number.isNaN(num)) return { title: "공지 | SEE VAR" }
  const notice = await prisma.notice.findUnique({
    where: { number: num },
    select: { title: true },
  })
  if (!notice) return { title: "공지 | SEE VAR" }
  return { title: `${notice.title} | 공지 | SEE VAR` }
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const num = parseInt((await params).number, 10)
  if (Number.isNaN(num)) notFound()

  const user = await getCurrentUser()
  const isAdmin = getIsAdmin(user)

  const notice = await prisma.notice.findUnique({
    where: { number: num },
    include: {
      author: { select: { name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  })
  if (!notice) notFound()

  type NoticeWithMedia = typeof notice & {
    attachments?: unknown
    youtubeUrls?: unknown
  }
  const n = notice as NoticeWithMedia
  const attachments = Array.isArray(n.attachments)
    ? (n.attachments as { name: string; url: string }[])
    : []
  const youtubeUrls = Array.isArray(n.youtubeUrls) ? (n.youtubeUrls as string[]) : []

  return (
    <main className="max-w-4xl mx-auto py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/notice"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          뒤로 가기
        </Link>
      </div>

      <article className="ledger-surface p-4 md:p-8 mb-8 border border-border">
        <header className="mb-6 md:mb-8 pb-4 border-b border-border">
          <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-2">
            {notice.title}
          </h1>
          <p className="font-mono text-[10px] md:text-xs text-muted-foreground">
            {notice.author?.name ?? "운영자"} ·{" "}
            {new Date(notice.createdAt).toLocaleString("ko-KR")}
            {!notice.allowComments && " · 댓글 비허용"}
          </p>
        </header>
        <NoticeContentWithAttachments content={notice.content} attachments={attachments} youtubeUrls={youtubeUrls} />
        {isAdmin && (
          <div className="mt-6 pt-4 border-t border-border flex gap-2">
            <Link
              href={`/notice/${notice.number}/edit`}
              className="font-mono text-xs text-primary hover:underline"
            >
              수정
            </Link>
            <NoticeDeleteButton noticeId={notice.id} />
          </div>
        )}
      </article>

      {notice.allowComments && (
        <NoticeCommentSection
          noticeId={notice.id}
          comments={notice.comments.map((c) => ({
            id: c.id,
            userId: c.userId,
            content: c.content,
            userName: c.user?.name ?? null,
            createdAt: c.createdAt.toISOString(),
          }))}
          currentUserId={user?.id ?? null}
        />
      )}
    </main>
  )
}
