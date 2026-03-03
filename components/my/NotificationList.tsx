"use client"

import { useRouter } from "next/navigation"
import { markNotificationRead } from "@/lib/actions/notifications"

type Item = {
  id: string
  content: string
  link: string | null
  replyContent: string | null
  isRead: boolean
  createdAt: string
}

type Props = {
  items: Item[]
}

export function NotificationList({ items }: Props) {
  const router = useRouter()

  const handleGoClick = async (item: Item) => {
    if (!item.link) return
    if (!item.isRead) {
      await markNotificationRead(item.id)
    }
    router.push(item.link)
  }

  if (items.length === 0) {
    return (
      <div className="space-y-0 border border-border bg-card/30">
        <div className="p-8 text-center font-mono text-sm text-muted-foreground">
          알림이 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0 border border-border bg-card/30">
      {items.map((n) => (
        <div
          key={n.id}
          className={`p-4 md:p-6 border-b border-border last:border-b-0 ${!n.isRead ? "bg-primary/5" : ""}`}
        >
          <p className="text-sm md:text-base text-foreground mb-2">{n.content}</p>
          {n.replyContent && (
            <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 py-1 mb-2 line-clamp-2">
              "{n.replyContent}"
            </p>
          )}
          {n.link && (
            <button
              type="button"
              onClick={() => handleGoClick(n)}
              className="font-mono text-[10px] md:text-xs text-primary hover:underline"
            >
              보러 가기 →
            </button>
          )}
          <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground mt-2">
            {new Date(n.createdAt).toLocaleString("ko-KR")}
          </p>
        </div>
      ))}
    </div>
  )
}

