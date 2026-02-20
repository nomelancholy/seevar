"use client"

import Link from "next/link"
import { User, X } from "lucide-react"
import { SheetClose } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type UserDrawerContentProps = {
  onClose?: () => void
}

// 시드/정적 기준 팀 엠블럼 (실제로는 유저 supportingTeam from DB)
const SUPPORTING_EMBLEM = "/assets/emblem/2026/kleague1/incheon_united_fc.svg"
const SUPPORTING_NAME = "인천 유나이티드"

export function UserDrawerContent({ onClose }: UserDrawerContentProps) {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">
          MY PAGE
        </h2>
        <SheetClose asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="닫기"
          >
            <X className="size-6" />
          </button>
        </SheetClose>
      </div>

      {/* 프로필 + 호각 */}
      <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 border border-border rounded-md">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center">
            <User className="size-8 text-muted-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-background rounded-full border border-border flex items-center justify-center p-1 shadow-lg z-10">
            <img
              src={SUPPORTING_EMBLEM}
              alt={SUPPORTING_NAME}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div>
          <p className="text-lg font-black italic">USER_7721</p>
          <div className="mt-1 inline-flex items-center gap-1.5 bg-amber-400/90 text-black px-2 py-0.5 rounded-full text-[10px] font-black">
            <span className="inline-block size-2.5 bg-current rounded-sm" />
            1,240 호각
          </div>
        </div>
      </div>

      {/* Supporting Team */}
      <div className="flex items-center justify-between mb-12 px-4 py-3 border-l-4 border-chart-2 bg-chart-2/10 rounded-r">
        <div className="flex flex-col">
          <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
            Supporting Team
          </span>
          <span className="text-xs font-black italic">{SUPPORTING_NAME}</span>
        </div>
        <div className="w-10 h-10 bg-muted border border-border rounded flex items-center justify-center overflow-hidden">
          <img
            src={SUPPORTING_EMBLEM}
            alt=""
            className="w-8 h-8 object-contain"
          />
        </div>
      </div>

      <nav className="flex flex-col gap-0">
        <SheetClose asChild>
          <Link
            href="/my"
            className="flex items-center gap-4 p-4 hover:bg-primary hover:text-primary-foreground transition-all rounded-md"
          >
            <span className="font-mono text-[10px] font-black tracking-widest uppercase">
              My Information
            </span>
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link
            href="/my/var-moments"
            className="flex items-center gap-4 p-4 hover:bg-primary hover:text-primary-foreground transition-all rounded-md"
          >
            <span className="font-mono text-[10px] font-black tracking-widest uppercase">
              My VAR Moments
            </span>
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link
            href="/my/whistle-recharge"
            className="flex items-center gap-4 p-4 hover:bg-primary hover:text-primary-foreground transition-all rounded-md"
          >
            <span className="font-mono text-[10px] font-black tracking-widest uppercase">
              Whistle Recharge
            </span>
          </Link>
        </SheetClose>
        <div className="h-px bg-border my-4" />
        <SheetClose asChild>
          <Link
            href="/api/auth/signout"
            className={cn(
              "flex items-center gap-4 p-4 rounded-md transition-all",
              "text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            )}
          >
            <span className="font-mono text-[10px] font-black tracking-widest uppercase">
              Logout
            </span>
          </Link>
        </SheetClose>
      </nav>
    </div>
  )
}
