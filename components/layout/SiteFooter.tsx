import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto mt-16 md:mt-24 pt-8 border-t border-border pb-12">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm md:text-base font-bold italic text-foreground/80">
            SEE VAR 후원하기
          </span>
          <a
            href="https://link.kakaopay.com/__/9RJDI7L"
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
        <span className="text-border shrink-0" aria-hidden>
          |
        </span>
        <span className="shrink-0">© SEE VAR. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
