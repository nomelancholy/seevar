# frozen_string_literal: true

class MatchReferee < ApplicationRecord
  belongs_to :match
  belongs_to :referee

  validates :role, presence: true
  validates :role, inclusion: { in: %w[main assistant var avar fourth] }
  validates :role, uniqueness: { scope: :match_id }
end
