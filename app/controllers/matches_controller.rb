# frozen_string_literal: true

class MatchesController < ApplicationController
  MOCK_MATCHES = [
    { id: "1", home: "인천 유나이티드", away: "FC 서울", league: "K League 1", round: 5, date: "2026-02-28", time: "14:00", venue: "인천 전용", status: "upcoming" },
    { id: "2", home: "울산 현대", away: "강원 FC", league: "K League 1", round: 5, date: "2026-02-28", time: "14:00", venue: "울산 문수", status: "live", score_home: 1, score_away: 0, minute: 67 },
    { id: "3", home: "전북 현대", away: "광주 FC", league: "K League 1", round: 5, date: "2026-02-27", time: "19:00", venue: "전주 월드컵", status: "finished", score_home: 2, score_away: 1 },
  ].freeze

  def index
    render inertia: "Matches/Index", props: { matches: MOCK_MATCHES }
  end

  def show
    match = MOCK_MATCHES.find { |m| m[:id] == params[:id] }
    return head :not_found unless match

    render inertia: "Matches/Show", props: { match: match }
  end
end
