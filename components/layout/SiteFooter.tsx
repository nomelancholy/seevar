import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto mt-16 md:mt-24 pt-8 border-t border-border pb-12">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm md:text-base font-bold italic text-foreground/80">
            SEE VAR 후원하기
          </span>
          <a
            href="https://link.kakaopay.com/__/ffe10Qe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity inline-flex items-center"
            title="카카오페이로 후원하기"
          >
            <img
              src="/assets/kakao_pay/btn_send_small.png"
              alt="카카오페이 송금하기"
              className="h-8 md:h-10 w-auto"
            />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-sm md:text-base text-muted-foreground">
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors underline underline-offset-2 shrink-0"
          >
            개인정보 처리 방침
          </Link>
          <span className="text-border shrink-0" aria-hidden>
            |
          </span>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors underline underline-offset-2 shrink-0"
          >
            이용약관
          </Link>
          <span className="text-border shrink-0" aria-hidden>
            |
          </span>
          <span className="shrink-0">
            문의:{" "}
            <a
              href="mailto:takeknowledge@naver.com"
              className="hover:text-foreground transition-colors underline underline-offset-1"
            >
              takeknowledge@naver.com
            </a>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-sm text-muted-foreground">
          <p className="text-center">© Take Knowledge. All rights reserved.</p>
          <a
            href="https://takeknowledge-dev.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            aria-label="Take Knowledge 개발자 포트폴리오 (새 탭에서 열림)"
          >
            개발자 포트폴리오
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  )
}
