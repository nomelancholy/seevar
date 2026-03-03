import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { getNotifications } from "@/lib/notifications"
import { NotificationList } from "@/components/my/NotificationList"

export const metadata = {
  title: "알림 | See VAR",
  description: "알림 목록",
}

export default async function MyNotificationsPage() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <main className="py-8 md:py-12 max-w-2xl mx-auto">
        <p className="font-mono text-muted-foreground">로그인하면 알림을 확인할 수 있습니다.</p>
        <Link href="/login" className="mt-4 inline-block text-primary font-mono text-sm hover:underline">
          로그인
        </Link>
      </main>
    )
  }

  const notifications = await getNotifications(user.id)
  const items = notifications.map((n) => ({
    id: n.id,
    content: n.content,
    link: n.link,
    replyContent: "replyContent" in n ? (n as typeof n & { replyContent?: string | null }).replyContent ?? null : null,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }))

  return (
    <main className="py-8 md:py-12 max-w-2xl mx-auto">
      <div className="mb-6 md:mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          뒤로 가기
        </Link>
      </div>

      <header className="mb-8 md:mb-12">
        <h1 className="text-3xl md:5xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
          알림
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
          답글 등 활동 알림을 확인하세요.
        </p>
      </header>

      <NotificationList items={items} />
    </main>
  )
}
