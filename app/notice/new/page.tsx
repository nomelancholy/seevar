import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getIsAdmin } from "@/lib/auth"
import { ChevronLeft } from "lucide-react"
import { NoticeForm } from "../NoticeForm"

export const metadata = {
  title: "공지 작성 | See VAR",
  description: "공지 작성",
}

export default async function NoticeNewPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!getIsAdmin(user)) redirect("/notice")

  return (
    <main className="max-w-4xl mx-auto py-8 md:py-12">
      <div className="mb-6 md:mb-8">
        <Link
          href="/notice"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          목록
        </Link>
      </div>

      <header className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
          공지 작성
        </h1>
        <p className="font-mono text-[10px] md:text-sm text-muted-foreground">
          제목·내용을 입력하고 댓글 허용 여부를 선택하세요.
        </p>
      </header>

      <NoticeForm />
    </main>
  )
}
