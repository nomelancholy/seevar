import Link from "next/link"

export const metadata = {
  title: "Login | See VAR",
  description: "Welcome back to See VAR",
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] rounded-md border border-border bg-card p-8 md:p-12 shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
        <div className="mb-10 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none mb-2">
            SEE <span className="text-primary">VAR</span>
          </h1>
          <p className="font-mono text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-widest">
            Football Judgment Portal
          </p>
        </div>

        <h2 className="text-lg md:text-xl font-black italic uppercase mb-6 md:mb-8 tracking-tight">
          Welcome Back
        </h2>

        <div className="space-y-4">
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-3 w-full bg-[#03C75A] text-white font-black text-sm py-3 md:py-4 rounded-md hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-md"
          >
            <svg
              className="size-4 md:size-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
            </svg>
            NAVER LOGIN
          </Link>
          <p className="text-[8px] md:text-[9px] font-mono text-muted-foreground mt-6 text-center">
            By continuing, you agree to our <br />
            <span className="underline cursor-pointer hover:text-foreground">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="underline cursor-pointer hover:text-foreground">
              Privacy Policy
            </span>
            .
          </p>
        </div>

        <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-border">
          <Link
            href="/"
            className="text-[8px] md:text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
