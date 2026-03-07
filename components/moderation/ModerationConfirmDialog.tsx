"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MESSAGE_INTRO =
  "작성하신 글에서 다소 높은 수위의 공격적 표현이 감지되었습니다."
const MESSAGE_WARNING =
  "지나친 비난과 비하 발언은 상대방에게 상처가 될 뿐만 아니라, 법적 조치의 대상이 될 수도 있습니다."
const MESSAGE_ASK =
  "SEE VAR가 더 건강한 토론의 장이 될 수 있도록 한 번 더 생각해보시겠어요?"

/** 0~1 점수에서 높은 순으로 상위 카테고리만 표시 (영문 키 → 한글 라벨) */
const CATEGORY_LABELS: Record<string, string> = {
  harassment: "괴롭힘",
  "harassment/threatening": "협박",
  "hate": "혐오",
  "hate/threatening": "혐오·위협",
  "self-harm": "자해",
  "sexual": "성적",
  "sexual/minors": "미성년자 성적",
  "violence": "폭력",
  "violence/graphic": "폭력·노출",
}

function formatScores(scores: Record<string, number>): string {
  const entries = Object.entries(scores)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
  if (entries.length === 0) return "—"
  return entries
    .map(([k, v]) => {
      const label = CATEGORY_LABELS[k] ?? k
      return `${label} ${((v as number) * 100).toFixed(0)}%`
    })
    .join(", ")
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scores: Record<string, number>
  flagged: boolean
  onEdit: () => void
  onConfirmAnyway: () => void
  confirmAnywayPending?: boolean
}

export function ModerationConfirmDialog({
  open,
  onOpenChange,
  scores,
  flagged,
  onEdit,
  onConfirmAnyway,
  confirmAnywayPending = false,
}: Props) {
  const handleEdit = () => {
    onEdit()
    onOpenChange(false)
  }
  const handleConfirmAnyway = () => {
    onConfirmAnyway()
    // 부모에서 force-submit 성공 시 onOpenChange(false) 호출
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] gap-4">
        <DialogHeader>
          <DialogTitle className="text-base font-mono">
            유해 표현 감지
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            {MESSAGE_INTRO}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {MESSAGE_WARNING}
          </p>
          <p className="leading-relaxed">{MESSAGE_ASK}</p>
          {Object.keys(scores).length > 0 && (
            <p className="font-mono text-xs text-muted-foreground pt-1 border-t border-border">
              감지 점수 (0~100%): {formatScores(scores)}
              {flagged && " · 플래그됨"}
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={handleEdit}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "font-mono text-xs uppercase"
            )}
          >
            수정하기
          </button>
          <button
            type="button"
            onClick={handleConfirmAnyway}
            disabled={confirmAnywayPending}
            className={cn(
              buttonVariants({ variant: "default" }),
              "font-mono text-xs uppercase disabled:opacity-50"
            )}
          >
            {confirmAnywayPending ? "등록 중…" : "그래도 등록"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
