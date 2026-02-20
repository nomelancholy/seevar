# frozen_string_literal: true

class Round < ApplicationRecord
  belongs_to :league
  has_many :matches, dependent: :destroy

  validates :number, :start_at, :end_at, presence: true
  validates :number, uniqueness: { scope: :league_id }

  scope :current, -> { where(is_current: true) }
  scope :ordered, -> { order(:number) }
end
