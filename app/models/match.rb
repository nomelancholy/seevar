# frozen_string_literal: true

class Match < ApplicationRecord
  belongs_to :round
  belongs_to :home_team, class_name: "Team"
  belongs_to :away_team, class_name: "Team"
  has_many :match_referees, dependent: :destroy
  has_many :referees, through: :match_referees

  validates :played_at, :status, presence: true
  validates :status, inclusion: { in: %w[scheduled live finished] }

  scope :scheduled, -> { where(status: "scheduled") }
  scope :live, -> { where(status: "live") }
  scope :finished, -> { where(status: "finished") }
  scope :ordered_by_played_at, -> { order(played_at: :asc) }

  # 경기 진행 분 표시. extra_minute 있으면 "45+2" 형태
  def display_minute
    return nil if minute.nil?
    extra_minute.to_i.positive? ? "#{minute}+#{extra_minute}" : minute.to_s
  end
end
