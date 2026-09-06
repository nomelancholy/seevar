import Link from "next/link"
import {
  Calendar,
  Layers,
  Users,
  UserCheck,
  UserCog,
  Trophy,
  Flag,
  FileText,
  UserCircle,
  MessageSquare,
  Star,
  CalendarRange,
} from "lucide-react"

const groups = [
  {
    title: "시즌 준비",
    description: "새 시즌을 만들고 팀·심판 명단을 구성합니다.",
    sections: [
      {
        title: "연도별 소속 관리",
        description: "시즌별 팀 리그 소속과 활동 심판 명단 관리",
        href: "/admin/season-rosters",
        icon: CalendarRange,
      },
      {
        title: "시즌·리그·라운드",
        description: "시즌(연도), 리그, 라운드 추가 및 구조 관리",
        href: "/admin/structure",
        icon: Layers,
      },
      {
        title: "팀 기본 정보",
        description: "팀 이름·슬러그·엠블럼 등록 및 수정",
        href: "/admin/teams",
        icon: Users,
      },
      {
        title: "심판 기본 정보",
        description: "심판 이름·슬러그·외부 링크 등록 및 수정",
        href: "/admin/referees",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "경기 운영",
    description: "일정부터 결과와 심판 배정까지 관리합니다.",
    sections: [
      {
        title: "경기 일정",
        description: "경기 일정 수정, 수동 추가·삭제",
        href: "/admin/matches",
        icon: Calendar,
      },
      {
        title: "경기 결과",
        description: "경기 결과·상태 수동 반영",
        href: "/admin/results",
        icon: Trophy,
      },
      {
        title: "심판 배정 정보",
        description: "시즌 활동 심판을 경기 역할별로 배정",
        href: "/admin/referee-assignments",
        icon: UserCog,
      },
    ],
  },
  {
    title: "커뮤니티 운영",
    description: "사용자 콘텐츠와 계정을 관리합니다.",
    sections: [
      {
        title: "신고 관리",
        description: "신고된 댓글·심판 평가 검토 및 숨김 처리",
        href: "/admin/reports",
        icon: Flag,
      },
      {
        title: "댓글 관리",
        description: "댓글 목록, Moderation 점수 및 노출 상태 관리",
        href: "/admin/comments",
        icon: MessageSquare,
      },
      {
        title: "한줄평 관리",
        description: "심판 한줄평과 Moderation 상태 관리",
        href: "/admin/reviews",
        icon: Star,
      },
      {
        title: "유저 관리",
        description: "가입 유저, 닉네임·응원팀 조회 및 수정",
        href: "/admin/users",
        icon: UserCircle,
      },
      {
        title: "공지",
        description: "공지 작성·수정·삭제",
        href: "/notice",
        icon: FileText,
      },
    ],
  },
]

export default function AdminPage() {
  return (
    <main className="max-w-5xl mx-auto pb-12 md:pb-16 space-y-10">
      {groups.map((group) => (
        <section key={group.title}>
          <div className="mb-4">
            <h2 className="font-mono text-sm font-black uppercase tracking-widest">{group.title}</h2>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.sections.map((section) => {
              const Icon = section.icon
              return (
                <Link key={section.href} href={section.href} className="block h-full">
                  <div className="ledger-surface h-full p-4 md:p-5 border border-border flex flex-col gap-2 transition-colors hover:border-primary hover:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="p-2 border border-border bg-muted/30">
                        <Icon className="size-4 text-muted-foreground" />
                      </span>
                      <h3 className="font-bold font-mono text-sm uppercase tracking-wider">
                        {section.title}
                      </h3>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </main>
  )
}
