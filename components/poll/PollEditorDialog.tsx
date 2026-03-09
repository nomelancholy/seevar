"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  options: string[]
  onSave: (title: string, options: string[]) => void
}

export function PollEditorDialog({ open, onOpenChange, title, options, onSave }: Props) {
  const [localTitle, setLocalTitle] = useState(title)
  const [localOptions, setLocalOptions] = useState<string[]>(options.length ? options : ["", ""])

  useEffect(() => {
    if (open) {
      setLocalTitle(title)
      setLocalOptions(options.length ? options : ["", ""])
    }
  }, [open, title, options])

  const handleAddOption = () => {
    setLocalOptions((prev) => [...prev, ""])
  }

  const handleSave = () => {
    const trimmedTitle = localTitle.trim()
    const trimmedOptions = localOptions.map((o) => o.trim()).filter((o) => o.length > 0)
    if (!trimmedTitle || trimmedOptions.length < 2) {
      return
    }
    onSave(trimmedTitle, trimmedOptions)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-mono">투표 만들기</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="제목을 입력해주세요"
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono"
          />
          <div className="space-y-2">
            {localOptions.map((opt, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-2 bg-muted/60 border border-border rounded px-2 py-1.5"
                )}
              >
                <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                <input
                  value={opt}
                  onChange={(e) =>
                    setLocalOptions((prev) =>
                      prev.map((v, i) => (i === idx ? e.target.value : v))
                    )
                  }
                  placeholder="항목을 입력하세요"
                  className="flex-1 bg-transparent border-0 text-sm font-mono focus:outline-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-1 text-xs font-mono text-muted-foreground hover:text-primary"
            >
              + 항목 추가
            </button>
          </div>
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 text-[11px] font-mono rounded border border-primary bg-primary text-primary-foreground hover:opacity-90"
          >
            확인
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-[11px] font-mono rounded border border-border text-muted-foreground hover:bg-muted"
          >
            취소
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

