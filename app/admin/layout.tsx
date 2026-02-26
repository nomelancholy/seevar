import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { ChevronLeft } from "lucide-react"

export const metadata = {
  title: "관리자 | See VAR",
  description: "관리자 페이지",
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!getIsAdmin(user)) redirect("/notice")

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <Link
            href="/notice"
            className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            공지로
          </Link>
        </div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
            관리자
          </h1>
          <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
            경기·심판·신고 등 데이터와 운영 관리를 할 수 있습니다.
          </p>
        </header>
      </div>
      {children}
    </div>
  )
}
