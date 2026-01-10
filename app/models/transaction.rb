# frozen_string_literal: true

class Transaction < ApplicationRecord
  acts_as_tenant :workspace

  # Associations
  belongs_to :statement, optional: true
  belongs_to :account, optional: true
  belongs_to :user
  belongs_to :category, optional: true
  belongs_to :subcategory, optional: true
  belongs_to :ai_category, class_name: 'Category', optional: true
  belongs_to :invoice, optional: true

  has_one :attached_invoice, class_name: 'Invoice', foreign_key: 'matched_transaction_id'

  # Validations
  validates :transaction_date, presence: true
  validates :description, presence: true
  validates :amount, presence: true, numericality: true
  validates :transaction_type, presence: true, inclusion: { in: %w[debit credit] }
  validate :subcategory_belongs_to_category

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

  # Categorization status constants
  CATEGORIZATION_STATUSES = %w[pending processing completed failed].freeze

  # Transaction kind constants (high-level intent)
  TX_KINDS = %w[
    spend
    transfer_p2p
    transfer_self
    transfer_wallet
    income_salary
    income_bonus
    income_investment
    income_refund
    investment
    loan_emi
    fee
    tax
    cash
  ].freeze


  # Scopes
  scope :debits, -> { where(transaction_type: 'debit') }
  scope :credits, -> { where(transaction_type: 'credit') }
  scope :reviewed, -> { where(is_reviewed: true) }
  scope :unreviewed, -> { where(is_reviewed: [false, nil]) }
  scope :uncategorized, -> { where(category_id: nil) }
  scope :categorized, -> { where.not(category_id: nil) }
  scope :recent, -> { order(transaction_date: :desc, created_at: :desc) }
  scope :by_date_range, ->(start_date, end_date) { where(transaction_date: start_date..end_date) }
  scope :categorization_pending, -> { where(categorization_status: 'pending') }
  scope :categorization_processing, -> { where(categorization_status: 'processing') }
  scope :categorization_completed, -> { where(categorization_status: 'completed') }
  scope :needs_categorization, -> { where(category_id: nil, ai_category_id: nil, categorization_status: %w[pending failed]) }

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

  def effective_subcategory
    subcategory
  end

  # Transaction kind helpers
  def transfer?
    tx_kind&.start_with?('transfer_')
  end

  def income?
    tx_kind&.start_with?('income_')
  end

  def spend?
    tx_kind == 'spend'
  end

  def personal_transfer?
    tx_kind == 'transfer_p2p'
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

  def categorization_pending?
    categorization_status == 'pending'
  end

  def categorization_processing?
    categorization_status == 'processing'
  end

  def categorization_completed?
    categorization_status == 'completed'
  end

  def mark_categorization_processing!
    update_column(:categorization_status, 'processing')
  end

  def mark_categorization_completed!
    update_column(:categorization_status, 'completed')
  end

  def mark_categorization_failed!
    update_column(:categorization_status, 'failed')
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

  def subcategory_belongs_to_category
    return unless subcategory_id.present? && category_id.present?

    # Load subcategory if not already loaded
    subcat = subcategory_id_changed? ? Subcategory.find_by(id: subcategory_id) : subcategory

    if subcat && subcat.category_id != category_id
      errors.add(:subcategory, 'must belong to the selected category')
    end
  end
end
