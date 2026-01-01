# frozen_string_literal: true

class Transaction < ApplicationRecord
  # Associations
  belongs_to :statement, optional: true
  belongs_to :account, optional: true
  belongs_to :user
  belongs_to :category, optional: true
  belongs_to :ai_category, class_name: 'Category', optional: true

  # Validations
  validates :transaction_date, presence: true
  validates :description, presence: true
  validates :amount, presence: true, numericality: true
  validates :transaction_type, presence: true, inclusion: { in: %w[debit credit] }

  # Callbacks
  before_validation :set_defaults
  before_save :normalize_description

  # Ransack configuration
  self.whitelisted_ransackable_attributes = %w[
    transaction_date
    description
    original_description
    amount
    transaction_type
    balance
    reference
    category_id
    account_id
    statement_id
    is_reviewed
    confidence
  ]

  self.whitelisted_ransackable_associations = %w[
    category
    account
    statement
    user
  ]

  self.whitelisted_ransackable_scopes = %w[
    debits
    credits
    reviewed
    unreviewed
    uncategorized
    categorized
    recent
    by_date_range
  ]

  # Scopes
  scope :debits, -> { where(transaction_type: 'debit') }
  scope :credits, -> { where(transaction_type: 'credit') }
  scope :reviewed, -> { where(is_reviewed: true) }
  scope :unreviewed, -> { where(is_reviewed: [false, nil]) }
  scope :uncategorized, -> { where(category_id: nil) }
  scope :categorized, -> { where.not(category_id: nil) }
  scope :recent, -> { order(transaction_date: :desc, created_at: :desc) }
  scope :by_date_range, ->(start_date, end_date) { where(transaction_date: start_date..end_date) }
  scope :by_month, ->(year, month) {
    start_date = Date.new(year, month, 1)
    end_date = start_date.end_of_month
    by_date_range(start_date, end_date)
  }

  # Instance methods
  def debit?
    transaction_type == 'debit'
  end

  def credit?
    transaction_type == 'credit'
  end

  def signed_amount
    debit? ? -amount.abs : amount.abs
  end

  def effective_category
    category || ai_category
  end

  def high_confidence?
    confidence.present? && confidence >= 0.8
  end

  def medium_confidence?
    confidence.present? && confidence >= 0.5 && confidence < 0.8
  end

  def low_confidence?
    confidence.present? && confidence < 0.5
  end

  def apply_ai_category!
    return unless ai_category.present? && category.nil?

    update!(category: ai_category, is_reviewed: false)
  end

  private

  def set_defaults
    self.is_reviewed = false if is_reviewed.nil?
    self.metadata ||= {}
  end

  def normalize_description
    self.description = description&.strip&.gsub(/\s+/, ' ')
    self.original_description ||= description
  end
end
