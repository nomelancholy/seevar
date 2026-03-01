"use client";

import Link from "next/link";
import Image from "next/image";
import { User, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { UserDrawerContent } from "./UserDrawerContent";
import { NotificationModal } from "./NotificationModal";

export type NavUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  supportingTeam: {
    id: string;
    name: string;
    emblemPath: string | null;
  } | null;
};

type SiteNavProps = { user: NavUser | null; unreadNotificationCount?: number };

export function SiteNav({ user, unreadNotificationCount = 0 }: SiteNavProps) {
  const navLinks = [
    { href: "/about", label: "ABOUT" },
    { href: "/notice", label: "NOTICE" },
    { href: "/matches", label: "ARCHIVE" },
    { href: "/referees", label: "REFEREES" },
    { href: "/teams", label: "TEAMS" },
  ];

  return (
    <nav className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12 border-b border-border pb-6 w-full">
      <div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0 md:min-w-0">
        {/* 모바일: 햄버거 → 왼쪽 메뉴 시트 */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="메뉴 열기"
            >
              <Menu className="size-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:max-w-[85vw] p-0 flex flex-col">
            <SheetTitle className="sr-only">메뉴</SheetTitle>
            <div className="p-4 border-b border-border">
              <Link href="/" className="text-xl font-black tracking-tighter italic">
                SEE <span className="text-primary">VAR</span>
              </Link>
            </div>
            <nav className="flex flex-col p-4 gap-1 font-mono text-sm font-bold tracking-widest">
              {navLinks.map(({ href, label }) => (
                <SheetClose asChild key={href}>
                  <Link
                    href={href}
                    className="py-3 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <Link
          href="/"
          className="text-2xl md:text-3xl font-black tracking-tighter leading-none italic hover:opacity-80 transition-opacity"
        >
          SEE <span className="text-primary">VAR</span>
        </Link>
        <div
          className="h-8 w-px bg-border hidden md:block shrink-0 md:ml-6 lg:ml-8"
          aria-hidden
        />
        {user ? (
          <NotificationModal
            unreadCount={unreadNotificationCount}
            compact
            className="md:hidden relative p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
            ariaLabel={
              unreadNotificationCount > 0
                ? `알림 ${unreadNotificationCount}건`
                : "알림"
            }
          />
        ) : null}
        {/* 모바일: 프로필(이미지) + 우하단 엠블럼 → 드로어 */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="md:hidden relative shrink-0 rounded-full border border-border bg-card overflow-visible p-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={
                user ? "마이페이지 열기" : "네이버 로그인 또는 회원가입"
              }
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-card flex items-center justify-center">
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="size-[18px] text-muted-foreground" />
                )}
              </div>
              {user?.supportingTeam?.emblemPath && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full border border-border flex items-center justify-center p-0.5 shadow-lg z-10 overflow-hidden">
                  <Image
                    src={user.supportingTeam.emblemPath}
                    alt=""
                    width={16}
                    height={16}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] sm:max-w-[320px] p-0">
            <SheetTitle className="sr-only">마이페이지</SheetTitle>
            <UserDrawerContent user={user} onClose={() => {}} />
          </SheetContent>
        </Sheet>
      </div>

      {/* 데스크톱: 메뉴 링크 — 중앙 균형 배치 / 모바일: 햄버거 메뉴로 대체 */}
      <div className="hidden md:flex flex-1 items-center justify-center gap-8 md:gap-12 lg:gap-14 text-xs md:text-sm font-bold tracking-widest font-mono min-w-0">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="menu-link text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* 데스크톱: 알림 + 로그인 시 Supporting / 비로그인 시 LOG IN */}
      <div className="hidden md:flex items-center shrink-0 md:ml-6 lg:ml-8 gap-4">
        {user ? (
          <>
            <NotificationModal
              unreadCount={unreadNotificationCount}
              className="relative p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              ariaLabel={
                unreadNotificationCount > 0
                  ? `알림 ${unreadNotificationCount}건`
                  : "알림"
              }
            />
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="hidden md:flex items-center gap-3 pl-6 lg:pl-8 border-l border-border cursor-pointer group"
                  aria-label="마이페이지 열기"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-muted-foreground leading-none mb-1 uppercase">
                      Supporting
                    </span>
                    <span className="text-[10px] text-foreground leading-none font-black italic">
                      {user.supportingTeam?.name ?? "미설정"}
                    </span>
                  </div>
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center group-hover:border-foreground transition-colors relative">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    {user.supportingTeam?.emblemPath && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background rounded-full border border-border flex items-center justify-center p-0.5 shadow-lg z-10 overflow-hidden">
                        <Image
                          src={user.supportingTeam.emblemPath}
                          alt=""
                          width={20}
                          height={20}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[320px] sm:max-w-[320px] p-0"
              >
                <SheetTitle className="sr-only">마이페이지</SheetTitle>
                <UserDrawerContent user={user} onClose={() => {}} />
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <Link
            href="/login"
            className="hidden md:flex items-center gap-3 pl-6 lg:pl-8 border-l border-border group text-muted-foreground hover:text-foreground transition-colors"
            aria-label="로그인 또는 회원가입"
          >
            <div className="flex flex-col items-end">
              <span className="text-[9px] leading-none mb-0.5 uppercase text-muted-foreground">
                LOG IN ·
              </span>
              <span className="text-[9px] leading-none uppercase text-muted-foreground">
                SIGN UP
              </span>
            </div>
            <div className="w-11 h-11 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center group-hover:border-foreground transition-colors shrink-0">
              <User className="size-5 text-muted-foreground" />
            </div>
          </Link>
        )}
      </div>
    </nav>
  );
}
