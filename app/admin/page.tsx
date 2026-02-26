import Link from "next/link"
import {
  Calendar,
  Layers,
  UserCheck,
  Trophy,
  Flag,
  FileText,
} from "lucide-react"

const sections = [
  {
    title: "시즌·리그·라운드 관리",
    description: "시즌(연도), 리그, 라운드 추가 및 구조 관리",
    href: "/admin/structure",
    icon: Layers,
    comingSoon: false,
  },
  {
    title: "경기 일정",
    description: "경기 일정 수정, 수동 추가·삭제",
    href: "/admin/matches",
    icon: Calendar,
    comingSoon: false,
  },
  {
    title: "심판 정보",
    description: "심판 정보 등록·수정·삭제",
    href: "/admin/referees",
    icon: UserCheck,
    comingSoon: false,
  },
  {
    title: "경기 결과",
    description: "경기 결과·상태 수동 반영",
    href: "/admin/results",
    icon: Trophy,
    comingSoon: false,
  },
  {
    title: "신고·유저",
    description: "신고 접수 유저 조치 및 관리",
    href: "/admin/reports",
    icon: Flag,
    comingSoon: false,
  },
  {
    title: "공지",
    description: "공지 작성·수정·삭제",
    href: "/notice",
    icon: FileText,
    comingSoon: false,
  },
]

export default function AdminPage() {
  return (
    <main className="max-w-4xl mx-auto pb-12 md:pb-16">
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => {
          const Icon = s.icon
          const content = (
            <div
              className={`ledger-surface p-4 md:p-6 border flex flex-col gap-2 transition-colors ${
                s.comingSoon
                  ? "border-border opacity-75 cursor-default"
                  : "border-border hover:border-primary hover:bg-muted/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="p-2 border border-border bg-muted/30">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <h2 className="font-bold font-mono text-sm uppercase tracking-wider">
                  {s.title}
                </h2>
                {s.comingSoon && (
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase">
                    준비 중
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </div>
          )
          return s.comingSoon ? (
            <div key={s.href}>{content}</div>
          ) : (
            <Link key={s.href} href={s.href}>
              {content}
            </Link>
          )
        })}
      </div>
    </main>
  )
}
