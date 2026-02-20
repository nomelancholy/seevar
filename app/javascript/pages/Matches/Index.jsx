import { Link } from "@inertiajs/react"
import Layout from "../../components/Layout"

export default function MatchesIndex({ matches }) {
  return (
    <Layout>
      <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-6">ARCHIVE / MATCHES</h1>
      <ul className="space-y-4">
        {matches.map((match) => (
          <li key={match.id}>
            <Link
              href={`/matches/${match.id}`}
              className="block p-4 rounded border border-[var(--ledger-border)] bg-[var(--ledger-surface)] hover:border-[var(--accent-var)] transition-colors no-underline text-[var(--text-main)]"
            >
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="font-black italic">
                  {match.home} vs {match.away}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {match.league} R{match.round}
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {match.date} {match.time} · {match.venue}
              </div>
              {match.status === "live" && (
                <div className="text-[var(--accent-var)] font-mono text-sm mt-2">
                  {match.score_home} - {match.score_away} ({match.minute}&apos;)
                </div>
              )}
              {match.status === "finished" && (
                <div className="font-mono text-sm mt-2">
                  {match.score_home} - {match.score_away} (FT)
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  )
}
