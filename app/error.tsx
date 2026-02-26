"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Page error:", error)
  }, [error])

  const message =
    error.message && error.message.length < 200 ? error.message : "일시적인 오류가 발생했습니다."

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <span className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="size-8 text-destructive" />
          </span>
        </div>
        <h1 className="text-xl font-black italic tracking-tighter uppercase mb-2">오류</h1>
        <p className="text-muted-foreground text-sm mb-8 font-mono">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="button"
            variant="outline"
            className="font-mono text-[10px] font-black uppercase"
            onClick={reset}
          >
            다시 시도
          </Button>
          <Button asChild variant="default" className="font-mono text-[10px] font-black uppercase">
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
