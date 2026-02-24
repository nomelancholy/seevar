"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteAccount } from "@/app/my/actions"

export function MyInformationDangerZone() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setPending(true)
    const result = await deleteAccount()
    setPending(false)
    if (result.ok) {
      router.push("/")
      router.refresh()
    } else {
      alert(result.error)
    }
  }

  return (
    <div className="p-6 md:p-8 border border-destructive/30 bg-destructive/5">
      <h3 className="text-xs md:text-sm font-black italic text-destructive uppercase mb-2">
        Danger Zone
      </h3>
      <p className="text-[10px] md:text-xs text-muted-foreground mb-6">
        계정을 삭제하면 모든 데이터가 소멸되며 복구할 수 없습니다.
      </p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="border border-destructive text-destructive px-6 py-2.5 text-[9px] md:text-[10px] font-black italic font-mono hover:bg-destructive hover:text-destructive-foreground transition-all disabled:opacity-50"
      >
        {pending
          ? "처리 중…"
          : confirm
            ? "정말 삭제하려면 다시 클릭"
            : "DELETE ACCOUNT"}
      </button>
    </div>
  )
}
