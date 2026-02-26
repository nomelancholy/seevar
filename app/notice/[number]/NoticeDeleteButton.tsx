"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteNotice } from "@/lib/actions/notices"

export function NoticeDeleteButton({ noticeId }: { noticeId: string }) {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm("이 공지를 삭제할까요?")) return
    setPending(true)
    const result = await deleteNotice(noticeId)
    setPending(false)
    if (result.ok) router.push("/notice")
    else alert(result.error)
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="font-mono text-xs text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "삭제 중…" : "삭제"}
    </button>
  )
}
