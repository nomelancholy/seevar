import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminUserList } from "./AdminUserList"

export const metadata = {
  title: "유저 관리 | 관리자 | SEE VAR",
  description: "가입 유저 목록, 닉네임·응원팀 조회 및 닉네임 수정",
}

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      supportingTeam: { select: { id: true, name: true } },
    },
  })

  return (
    <main className="max-w-4xl mx-auto pb-12 md:pb-16">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 관리자
        </Link>
      </div>
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
        유저 관리
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        가입한 유저 목록입니다. 닉네임·응원팀을 확인하고, 닉네임 수정 버튼으로 닉네임을 변경할 수 있습니다. (변경 시 커뮤니티 가이드 검사 적용)
      </p>
      <AdminUserList users={users} />
    </main>
  )
}
