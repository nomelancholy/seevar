import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto mt-16 md:mt-24 pt-8 border-t border-border">
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
    </footer>
  )
}
