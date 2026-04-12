import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkCrawlerAuth } from "@/lib/auth"
import { makeUniqueRefereeSlug } from "@/lib/referee-slug"

export async function POST(request: NextRequest) {
  if (!checkCrawlerAuth(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, link } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // 이름으로 기존 슬러그 조회 (동명이인 처리용)
    const existingReferees = await prisma.referee.findMany({
      where: {
        name: name,
      },
      select: {
        slug: true,
      },
    })
    const existingSlugs = new Set(existingReferees.map((r) => r.slug))

    // 고유 슬러그 생성
    const uniqueSlug = makeUniqueRefereeSlug(name, existingSlugs)

    // DB에 등록
    const newReferee = await prisma.referee.create({
      data: {
        name: name.trim(),
        slug: uniqueSlug,
        link: link?.trim() || null,
      },
    })

    return NextResponse.json({
      ok: true,
      referee: newReferee,
    })
  } catch (error) {
    console.error("[api/referees/POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
