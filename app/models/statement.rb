# frozen_string_literal: true

class Statement < ApplicationRecord
  # Associations
  belongs_to :user
  belongs_to :account, optional: true
  has_many :transactions, dependent: :destroy
  has_one_attached :file

  # Validations
  validates :file_name, presence: true
  validates :file_type, presence: true, inclusion: { in: %w[csv xlsx xls pdf] }
  validates :status, presence: true, inclusion: { in: %w[pending processing parsed failed] }

  # Callbacks
  before_validation :set_defaults

  # Scopes
  scope :pending, -> { where(status: 'pending') }
  scope :processing, -> { where(status: 'processing') }
  scope :parsed, -> { where(status: 'parsed') }
  scope :failed, -> { where(status: 'failed') }
  scope :recent, -> { order(created_at: :desc) }

  # State machine-like methods
  def pending?
    status == 'pending'
  end

  def processing?
    status == 'processing'
  end

  def parsed?
    status == 'parsed'
  end

  def failed?
    status == 'failed'
  end

  def mark_processing!
    update!(status: 'processing')
  end

  def mark_parsed!
    update!(status: 'parsed', parsed_at: Time.current)
  end

  def mark_failed!(message)
    update!(status: 'failed', error_message: message)
  end

  def transaction_count
    transactions.count
  end

  def total_debits
    transactions.where(transaction_type: 'debit').sum(:amount).abs
  end

  def total_credits
    transactions.where(transaction_type: 'credit').sum(:amount)
  end

  private

  def set_defaults
    self.status ||= 'pending'
    self.metadata ||= {}
  end
end
