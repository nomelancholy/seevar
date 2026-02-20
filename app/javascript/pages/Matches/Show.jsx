import { Link } from "@inertiajs/react"
import Layout from "../../components/Layout"

export default function MatchShow({ match }) {
  if (!match) return null

  return (
    <Layout>
      <Link href="/matches" className="text-[var(--accent-var)] hover:underline text-sm mb-4 inline-block">
        ← 목록으로
      </Link>
      <article className="p-6 rounded border border-[var(--ledger-border)] bg-[var(--ledger-surface)]">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-2">
          {match.home} vs {match.away}
        </h1>
        <div className="text-[10px] font-mono text-[var(--text-muted)] mb-4">
          {match.league} R{match.round} · {match.date} {match.time} · {match.venue}
        </div>
        {match.status === "live" && (
          <p className="text-[var(--accent-var)] font-mono text-lg">
            {match.score_home} - {match.score_away} ({match.minute}&apos;)
          </p>
        )}
        {match.status === "finished" && (
          <p className="font-mono text-lg">
            {match.score_home} - {match.score_away} (FT)
          </p>
        )}
        {match.status === "upcoming" && (
          <p className="text-[var(--text-muted)]">경기 예정</p>
        )}
      </article>
    </Layout>
  )
}
