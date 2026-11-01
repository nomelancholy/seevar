"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

export function CopyTextButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert("복사에 실패했습니다. 아래 텍스트를 직접 선택해 복사해 주세요.")
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-3 py-1.5 font-mono text-xs font-bold hover:opacity-90"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "복사됨" : "전체 복사"}
    </button>
  )
}
