"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, User, X } from "lucide-react"
import { signOut } from "next-auth/react"
import { SheetClose } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { NavUser } from "./SiteNav"

type UserDrawerContentProps = {
  user: NavUser | null
  onClose?: () => void
}

export function UserDrawerContent({ user, onClose }: UserDrawerContentProps) {
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut({ callbackUrl: "/" })
    } finally {
      setSigningOut(false)
    }
  }

  if (!user) {
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
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-20 h-20 rounded-full border border-border bg-muted/50 flex items-center justify-center mb-6">
            <User className="size-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-8">
            로그인하면 마이페이지와 응원 팀을 이용할 수 있습니다.
          </p>
          <SheetClose asChild>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full max-w-[240px] bg-[#03C75A] text-white font-black text-sm py-3 rounded-md hover:opacity-90 transition-opacity"
            >
              NAVER LOGIN
            </Link>
          </SheetClose>
        </div>
      </div>
    )
  }

  const supportingName = user.supportingTeam?.name ?? "미설정"
  const supportingEmblem = user.supportingTeam?.emblemPath
  const displayName = user.name || user.email || `USER_${user.id.slice(-4)}`

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

      {/* 프로필 (호각 배지는 후순위 개발로 비노출) */}
      <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 border border-border rounded-md">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt=""
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="size-8 text-muted-foreground" />
            )}
          </div>
            {supportingEmblem && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-background rounded-full border border-border flex items-center justify-center p-1 shadow-lg z-10">
                <Image
                  src={supportingEmblem}
                  alt={supportingName}
                  width={28}
                  height={28}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black italic truncate">{displayName}</p>
        </div>
      </div>

      {/* Supporting Team */}
      <div className="flex items-center justify-between mb-12 px-4 py-3 border-l-4 border-chart-2 bg-chart-2/10 rounded-r">
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
            Supporting Team
          </span>
          <span className="text-xs font-black italic truncate">{supportingName}</span>
        </div>
        <div className="w-10 h-10 bg-muted border border-border rounded flex items-center justify-center overflow-hidden shrink-0">
          {supportingEmblem ? (
            <Image
              src={supportingEmblem}
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
          ) : (
            <User className="size-5 text-muted-foreground" />
          )}
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
        <div className="h-px bg-border my-4" />
        <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            className={cn(
              "flex w-full items-center gap-4 p-4 rounded-md transition-all text-left",
              "text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            )}
          >
            <span className="font-mono text-[10px] font-black tracking-widest uppercase">
              Logout
            </span>
          </button>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>로그아웃</DialogTitle>
              <DialogDescription>
                로그아웃 하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="font-mono text-[10px] font-black uppercase"
                onClick={() => setSignOutOpen(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                className="font-mono text-[10px] font-black uppercase bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut && <Loader2 className="size-4 shrink-0 animate-spin" />}
                {signingOut ? "로그아웃 중…" : "로그아웃"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  )
}
