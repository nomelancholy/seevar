# frozen_string_literal: true

class League < ApplicationRecord
  has_many :rounds, dependent: :destroy
  has_many :teams, dependent: :restrict_with_error

  validates :name, :slug, presence: true
  validates :slug, uniqueness: true
end
