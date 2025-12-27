# frozen_string_literal: true

class User < ApplicationRecord
  # Associations
  has_many :accounts, dependent: :destroy
  has_many :statements, dependent: :destroy
  has_many :transactions, dependent: :destroy

  # Validations
  validates :auth0_id, presence: true, uniqueness: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  # Callbacks
  before_save :set_default_settings

  # Instance methods
  def display_name
    name.presence || email.split('@').first
  end

  def total_expenses(period: nil)
    scope = transactions.where(transaction_type: 'debit')
    scope = scope.where(transaction_date: period) if period
    scope.sum(:amount).abs
  end

  def total_income(period: nil)
    scope = transactions.where(transaction_type: 'credit')
    scope = scope.where(transaction_date: period) if period
    scope.sum(:amount)
  end

  private

  def set_default_settings
    self.settings ||= {
      'currency' => 'INR',
      'date_format' => 'DD/MM/YYYY',
      'ca_whatsapp' => nil,
      'auto_send_enabled' => false,
      'send_day' => 1
    }
  end
end
