import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminReviewList } from "./AdminReviewList"

export const metadata = {
  title: "한줄평 관리 | 관리자 | SEE VAR",
  description: "등록된 심판 한줄평 목록, Moderation 점수, 숨김·귀여운 글로 바꾸기",
}

export default async function AdminReviewsPage() {
  const reviews = await prisma.refereeReview.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      user: { select: { id: true, name: true, email: true } },
      referee: { select: { id: true, name: true } },
      match: {
        select: {
          id: true,
          roundOrder: true,
          round: {
            select: {
              slug: true,
              league: {
                select: { slug: true, season: { select: { year: true } } },
              },
            },
          },
        },
      },
    },
  })

  return (
    <main className="max-w-5xl mx-auto pb-12 md:pb-16">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-muted-foreground hover:text-foreground"
        >
          ← 관리자
        </Link>
      </div>
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-2">
        한줄평 관리
      </h2>
      <p className="font-mono text-xs text-muted-foreground mb-6">
        등록된 심판 한줄평 목록입니다. Moderation API 점수(작성 시 기록)를 확인하고, 숨김 처리 또는 귀여운 글로 바꾸기를 할 수 있습니다. 처리 시 작성자에게 알림이 갑니다.
        <span className="block mt-1 text-muted-foreground/90">
          점수는 OpenAI 기준 해당 카테고리 해당 확률(0~1)이며, <strong>낮을수록 안전한 글로 판정된 것</strong>입니다. 0.5 이상이면 작성 시 자동으로 귀여운 글로 치환됩니다.
        </span>
      </p>
      <AdminReviewList reviews={reviews as Parameters<typeof AdminReviewList>[0]["reviews"]} />
    </main>
  )
}
