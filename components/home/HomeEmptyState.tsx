"use client"

import Link from "next/link"
import { Heart, CalendarDays, CircleUser, Trophy } from "lucide-react"

const NAV_ITEMS = [
  {
    href: "/about",
    label: "ABOUT",
    Icon: Heart,
    description: "See VAR가 무엇인지, 어떤 가치로 운영되는지 소개합니다.",
  },
  {
    href: "/matches",
    label: "ARCHIVE",
    Icon: CalendarDays,
    description: "과거·현재 경기 목록과 VAR 모멘트, 판정 토론을 한곳에서 확인하세요.",
  },
  {
    href: "/referees",
    label: "REFEREES",
    Icon: CircleUser,
    description: "주심·부심·VAR 등 심판 정보와 경기별 배정·평가를 볼 수 있습니다.",
  },
  {
    href: "/teams",
    label: "TEAMS",
    Icon: Trophy,
    description: "K리그 팀 정보와 엠블럼, 관련 경기를 모아서 볼 수 있습니다.",
  },
] as const

export function HomeEmptyState() {
  return (
    <section className="mb-8 md:mb-16">
      <div className="ledger-surface border border-border rounded-lg p-8 md:p-12 text-center">
        <p className="text-sm md:text-base text-muted-foreground font-mono mb-2">
          현재 포커스 라운드가 없습니다.
        </p>
        <p className="text-xs md:text-sm text-muted-foreground/80 mb-8">
          아래 메뉴에서 서비스를 이용해 보세요.
        </p>
        <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
          {NAV_ITEMS.map(({ href, label, Icon, description }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-4 p-6 md:p-8 rounded-xl border-2 border-border bg-card/50 hover:border-primary hover:bg-primary/5 transition-all group text-center"
            >
              <span className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary transition-colors shrink-0">
                <Icon className="size-7 md:size-8" />
              </span>
              <span className="font-black italic text-sm md:text-base tracking-tighter uppercase">
                {label}
              </span>
              <p className="text-xs md:text-sm font-mono text-muted-foreground leading-relaxed max-w-xs">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
