# frozen_string_literal: true

class StatementAnalytic < ApplicationRecord
  belongs_to :statement

  # Status enum for analytics computation state
  enum :status, {
    pending: 0,
    queued: 1,
    running: 2,
    completed: 3,
    failed: 4
  }

  # Ensure JSONB defaults
  attribute :monthly_spend, :jsonb, default: {}
  attribute :category_breakdown, :jsonb, default: {}
  attribute :merchant_breakdown, :jsonb, default: {}
  attribute :recurring_expenses, :jsonb, default: {}
  attribute :silent_drains, :jsonb, default: {}
  attribute :weekend_weekday, :jsonb, default: {}
  attribute :largest_expense, :jsonb, default: {}
  attribute :income_expense_ratio, :jsonb, default: {}

  # Check if analytics are fresh (computed recently and not stale)
  def fresh?
    completed? && computed_at.present? && computed_at > 1.hour.ago
  end

  # Check if analytics are stale (older than 1 hour or never computed)
  def stale?
    !fresh?
  end

  def to_analytics_hash
    {
      monthly_spend: monthly_spend || [],
      top_categories: category_breakdown['top_categories'] || [],
      top_merchants: merchant_breakdown['top_merchants'] || [],
      recurring_expenses: recurring_expenses || {},
      silent_drains: silent_drains['drains'] || [],
      weekend_vs_weekday: weekend_weekday || {},
      largest_expense: largest_expense || {},
      income_expense_ratio: income_expense_ratio || {}
    }
  end
end
