import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { getNotifications } from "@/lib/notifications"
import { markAllNotificationsRead } from "@/lib/actions/notifications"
import { ChevronLeft } from "lucide-react"

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
  const unreadCount = notifications.filter((n) => !n.isRead).length
  if (unreadCount > 0) {
    await markAllNotificationsRead()
  }

  return (
    <main className="py-8 md:py-12 max-w-2xl mx-auto">
      <div className="mb-6 md:mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          BACK
        </Link>
      </div>

      <header className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-2 md:mb-4">
          알림
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
          답글 등 활동 알림을 확인하세요.
        </p>
      </header>

      <div className="space-y-0 border border-border bg-card/30">
        {notifications.length === 0 ? (
          <div className="p-8 text-center font-mono text-sm text-muted-foreground">
            알림이 없습니다.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 md:p-6 border-b border-border last:border-b-0 ${!n.isRead ? "bg-primary/5" : ""}`}
            >
              <p className="text-sm md:text-base text-foreground mb-2">{n.content}</p>
              {"replyContent" in n && n.replyContent && (
                <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 py-1 mb-2 line-clamp-2">
                  "{n.replyContent}"
                </p>
              )}
              {n.link ? (
                <Link
                  href={n.link}
                  className="font-mono text-[10px] md:text-xs text-primary hover:underline"
                >
                  보러 가기 →
                </Link>
              ) : null}
              <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground mt-2">
                {new Date(n.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
