# frozen_string_literal: true

module MatchesHelper
  def match_status_badge(status)
    case status
    when :upcoming then tag.span("UPCOMING", class: "px-2 py-0.5 text-[10px] font-black uppercase font-mono bg-zinc-800 text-[var(--text-muted)]")
    when :live then tag.span("LIVE", class: "px-2 py-0.5 text-[10px] font-black uppercase font-mono bg-[var(--accent-var)] text-black var-pulse")
    when :finished then tag.span("FT", class: "px-2 py-0.5 text-[10px] font-black uppercase font-mono bg-zinc-700 text-white")
    else tag.span(status.to_s.upcase, class: "px-2 py-0.5 text-[10px] font-black uppercase font-mono")
    end
  end
end
