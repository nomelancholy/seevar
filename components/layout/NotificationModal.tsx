"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bell } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getNotificationsForCurrentUser } from "@/lib/actions/notifications"
import { markNotificationRead } from "@/lib/actions/notifications"
import type { NotificationItem } from "@/lib/actions/notifications"

type Props = {
  unreadCount: number
  className?: string
  ariaLabel?: string
  /** 모바일용 작은 버튼 스타일 */
  compact?: boolean
}

export function NotificationModal({
  unreadCount,
  className,
  ariaLabel,
  compact,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getNotificationsForCurrentUser()
      .then((res) => {
        if (res.ok) setItems(res.items)
        else setItems([])
      })
      .finally(() => setLoading(false))
  }, [open])

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.isRead) await markNotificationRead(n.id)
    setOpen(false)
    router.refresh()
    if (n.link) router.push(n.link)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={className ?? "relative p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"}
          aria-label={ariaLabel ?? (unreadCount > 0 ? `알림 ${unreadCount}건` : "알림")}
        >
          <Bell className={compact ? "size-5" : "size-5"} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 min-w-[1rem] h-4 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0 max-w-[360px]">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-base">알림</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="p-6 text-center font-mono text-sm text-muted-foreground">
              불러오는 중…
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center font-mono text-sm text-muted-foreground">
              알림이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left p-4 hover:bg-muted/30 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                  >
                    <p className="text-sm text-foreground mb-1">{n.content}</p>
                    {n.replyContent && (
                      <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 py-1 mb-2 line-clamp-2">
                        "{n.replyContent}"
                      </p>
                    )}
                    {n.link && (
                      <span className="font-mono text-[10px] text-primary">보러 가기 →</span>
                    )}
                    <p className="font-mono text-[9px] text-muted-foreground mt-2">
                      {new Date(n.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-3 border-t border-border">
          <Link
            href="/my/notifications"
            onClick={() => setOpen(false)}
            className="block text-center font-mono text-[10px] text-primary hover:underline py-2"
          >
            전체 알림 보기
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
