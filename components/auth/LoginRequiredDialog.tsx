"use client"

import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type Props = {
  open: boolean
  onClose: () => void
  message?: string
}

export function LoginRequiredDialog({ open, onClose, message }: Props) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>로그인이 필요합니다</DialogTitle>
          <DialogDescription>
            {message ?? "이 기능을 이용하려면 먼저 로그인해주세요."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Link
            href="/login"
            className="px-4 py-2 border border-primary bg-primary text-primary-foreground text-xs md:text-sm font-mono font-black uppercase rounded hover:bg-primary/90 transition-colors"
          >
            로그인 페이지로 이동
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border bg-muted text-muted-foreground text-xs md:text-sm font-mono font-black uppercase rounded hover:bg-muted/80 transition-colors"
          >
            닫기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

