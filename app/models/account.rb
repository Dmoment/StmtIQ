# frozen_string_literal: true

class Account < ApplicationRecord
  # Associations
  belongs_to :user
  has_many :statements, dependent: :destroy
  has_many :transactions, dependent: :destroy

  # Validations
  validates :name, presence: true
  validates :bank_name, presence: true
  validates :currency, presence: true

  # Callbacks
  before_validation :set_defaults

  # Scopes
  scope :active, -> { where(is_active: true) }

  # Constants
  ACCOUNT_TYPES = %w[savings current credit_card loan].freeze
  CURRENCIES = %w[INR USD EUR GBP].freeze
  BANKS = [
    'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank',
    'Kotak Mahindra Bank', 'Yes Bank', 'IndusInd Bank', 'Punjab National Bank',
    'Bank of Baroda', 'Canara Bank', 'Union Bank', 'IDFC First Bank',
    'Federal Bank', 'RBL Bank', 'Other'
  ].freeze

  def display_name
    "#{name} (#{bank_name} - #{account_number_last4})"
  end

  def current_balance
    transactions.order(transaction_date: :desc, created_at: :desc).first&.balance
  end

  private

  def set_defaults
    self.currency ||= 'INR'
    self.is_active = true if is_active.nil?
  end
end
