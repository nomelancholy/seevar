# frozen_string_literal: true

class Referee < ApplicationRecord
  has_many :match_referees, dependent: :destroy
  has_many :matches, through: :match_referees

  validates :name, presence: true
end
