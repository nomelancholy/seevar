"use client"

import Link from "next/link"
import { Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { UserDrawerContent } from "./UserDrawerContent"

export function SiteNav() {
  return (
    <nav className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-8 md:mb-12 border-b border-border pb-6 w-full">
      <div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0">
        <Link
          href="/"
          className="text-2xl md:text-3xl font-black tracking-tighter leading-none italic hover:opacity-80 transition-opacity"
        >
          SEE <span className="text-primary">VAR</span>
        </Link>
        <div className="h-8 w-px bg-border hidden md:block" aria-hidden />
        {/* 모바일: 프로필 버튼 → 드로어 */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full w-9 h-9 border border-border bg-card"
              aria-label="마이페이지 열기"
            >
              <User className="size-[18px] text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] sm:max-w-[320px] p-0">
            <SheetTitle className="sr-only">마이페이지</SheetTitle>
            <UserDrawerContent onClose={() => {}} />
          </SheetContent>
        </Sheet>
      </div>

      {/* 검색 */}
      <div className="relative flex-1 w-full max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50 pointer-events-none" />
        <Input
          type="search"
          placeholder="SEARCH MATCH, PLAYER, DATA..."
          className="w-full bg-card/80 border-border pl-4 pr-10 py-2 text-xs md:text-sm font-mono focus-visible:ring-primary"
          aria-label="검색"
        />
      </div>

      {/* 메뉴 링크 + 데스크톱 프로필 — 우측 상단 정렬 */}
      <div className="flex items-center justify-center md:justify-end md:ml-auto gap-4 md:gap-8 text-[10px] md:text-xs font-bold tracking-widest font-mono w-full md:w-auto overflow-x-auto no-scrollbar py-2 md:py-0 shrink-0">
        <Link
          href="/about"
          className="menu-link text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          ABOUT
        </Link>
        <Link
          href="/matches"
          className="menu-link text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          ARCHIVE
        </Link>
        <Link
          href="/referees"
          className="menu-link text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          REFEREES
        </Link>
        <Link
          href="/teams"
          className="menu-link text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          TEAMS
        </Link>

        {/* 데스크톱: 프로필 → 드로어 */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="hidden md:flex items-center gap-3 pl-4 border-l border-border cursor-pointer group"
              aria-label="마이페이지 열기"
            >
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-muted-foreground leading-none mb-1 uppercase">
                  Supporting
                </span>
                <span className="text-[10px] text-foreground leading-none font-black italic">
                  인천 유나이티드
                </span>
              </div>
              <div className="w-11 h-11 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center group-hover:border-foreground transition-colors">
                <User className="size-5 text-muted-foreground" />
              </div>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] sm:max-w-[320px] p-0">
            <SheetTitle className="sr-only">마이페이지</SheetTitle>
            <UserDrawerContent onClose={() => {}} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
