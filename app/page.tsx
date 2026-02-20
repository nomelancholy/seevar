import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <nav className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-8 md:mb-12 border-b border-[var(--ledger-border)] pb-6">
        <Link
          href="/"
          className="text-2xl md:text-3xl font-black tracking-tighter leading-none italic hover:opacity-80 transition-opacity"
        >
          SEE <span className="text-[var(--accent-var)]">VAR</span>
        </Link>
        <div className="flex-1 w-full max-w-md hidden md:block" />
        <div className="flex items-center gap-4 md:gap-8 text-[10px] md:text-xs font-bold tracking-widest font-mono">
          <Link href="/about" className="text-[var(--text-muted)] hover:text-white whitespace-nowrap">
            ABOUT
          </Link>
          <Link href="/matches" className="text-[var(--text-muted)] hover:text-white whitespace-nowrap">
            ARCHIVE
          </Link>
          <Link href="/referees" className="text-[var(--text-muted)] hover:text-white whitespace-nowrap">
            REFEREES
          </Link>
          <Link href="/teams" className="text-[var(--text-muted)] hover:text-white whitespace-nowrap">
            TEAMS
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        <section className="mb-8 md:mb-12">
          <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
            See VAR
          </h1>
          <p className="text-[var(--text-muted)]">
            Next.js + Prisma + PostgreSQL 스택으로 전환되었습니다.
          </p>
        </section>
      </main>
    </div>
  )
}
