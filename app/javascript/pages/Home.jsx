import { Link } from "@inertiajs/react"
import Layout from "../components/Layout"

export default function Home() {
  return (
    <Layout>
      <section className="mb-8 md:mb-12">
        <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
          HOT MOMENTS OF FOCUS ROUND
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5].map((rank) => (
            <Link
              key={rank}
              href="/matches/1"
              className="block p-3 md:p-4 rounded border border-[var(--ledger-border)] bg-[var(--ledger-surface)] hover:border-[var(--accent-var)] transition-colors no-underline text-[var(--text-main)]"
            >
              <div className="text-[10px] font-black text-black bg-[var(--accent-var)] w-5 h-5 rounded-full flex items-center justify-center mb-2">{rank}</div>
              <div className="text-[8px] md:text-[10px] text-[var(--text-muted)] font-mono mb-1">K LEAGUE 1</div>
              <div className="font-black italic text-xs md:text-sm mb-1">서울 vs 울산</div>
              <div className="text-[var(--accent-var)] font-bold font-mono text-[10px] md:text-xs">52&apos; ~ 27&apos;</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
          FOCUS ROUND
        </h2>
        <p className="text-[var(--text-muted)] text-sm">
          라운드별 경기 목록은 여기에 표시됩니다.
        </p>
      </section>
    </Layout>
  )
}
