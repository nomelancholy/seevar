# frozen_string_literal: true

class Team < ApplicationRecord
  belongs_to :league

  has_many :home_matches, class_name: "Match", foreign_key: :home_team_id, dependent: :restrict_with_error
  has_many :away_matches, class_name: "Match", foreign_key: :away_team_id, dependent: :restrict_with_error

  validates :name, presence: true
  validates :name, uniqueness: { scope: :league_id }

  def display_name
    short_name.presence || name
  end
end
