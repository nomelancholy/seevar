import Link from "next/link"
import { LoginNaverButton } from "@/components/auth/LoginNaverButton"
import { LoginPolicyLinks } from "@/components/auth/LoginPolicyLinks"

export const metadata = {
  title: "Login | See VAR",
  description: "Log in or sign up with Naver to use See VAR",
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex flex-col p-4">
      <div className="w-full max-w-7xl mx-auto mb-6 md:mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] md:text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
        >
          <span aria-hidden>←</span>
          Back to Home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[400px] rounded-md border border-border bg-card p-8 md:p-12 shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
          <div className="mb-10 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none mb-2">
              SEE <span className="text-primary">VAR</span>
            </h1>
            <p className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
              Football Judgment Portal
            </p>
          </div>

          <p className="text-lg md:text-xl font-black italic uppercase tracking-tight mb-1">
            WELCOME
          </p>
          <p className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-widest mb-6 md:mb-8">
            LOG IN · SIGN UP
          </p>

          <div className="space-y-4">
            <LoginNaverButton />
            <LoginPolicyLinks />
          </div>
        </div>
      </div>
    </div>
  )
}
