# frozen_string_literal: true

class Subcategory < ApplicationRecord
  belongs_to :category
  has_many :transactions, dependent: :nullify

  # Validations
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: { scope: :category_id }

  # Scopes
  scope :ordered, -> { order(:display_order, :name) }
  scope :default_for_category, ->(category) { where(category: category, is_default: true).first }

  # Callbacks
  before_validation :generate_slug, if: -> { slug.blank? && name.present? }

  # Check if a keyword matches this subcategory
  def matches_keyword?(text)
    return false if keywords.blank? || text.blank?

    normalized = text.downcase
    keywords.any? { |kw| normalized.include?(kw.downcase) }
  end

  # Class method to find by keyword match
  def self.find_by_keyword(text, category: nil)
    scope = category ? where(category: category) : all
    scope.find { |sub| sub.matches_keyword?(text) }
  end

  private

  def generate_slug
    base_slug = name.parameterize
    self.slug = "#{category&.slug}-#{base_slug}"
  end
end
