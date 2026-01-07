# frozen_string_literal: true

class User < ApplicationRecord
  # Associations
  has_many :accounts, dependent: :destroy
  has_many :statements, dependent: :destroy
  has_many :transactions, dependent: :destroy
  has_many :user_rules, dependent: :destroy
  has_many :labeled_examples, dependent: :destroy
  has_many :invoices, dependent: :destroy

  # Validations
  validates :phone_number, presence: true, uniqueness: true,
            format: { with: /\A[0-9]{10,15}\z/, message: "must be a valid phone number" }
  validates :email, uniqueness: true, allow_nil: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }, if: -> { email.present? }

  # Callbacks
  before_save :set_default_settings
  before_save :normalize_phone_number

  # Scopes
  scope :verified, -> { where(phone_verified: true) }

  # OTP Methods
  def generate_otp!
    self.otp_code = SecureRandom.random_number(10**6).to_s.rjust(6, '0')
    self.otp_expires_at = 5.minutes.from_now
    save!
    otp_code
  end

  def verify_otp!(code)
    return false if otp_code.blank? || otp_expires_at.blank?
    return false if Time.current > otp_expires_at
    return false if otp_code != code

    self.otp_code = nil
    self.otp_expires_at = nil
    self.phone_verified = true
    self.last_login_at = Time.current
    generate_session_token!
    true
  end

  def otp_expired?
    otp_expires_at.nil? || Time.current > otp_expires_at
  end

  # Session Methods
  def generate_session_token!
    self.session_token = SecureRandom.urlsafe_base64(32)
    self.session_expires_at = 30.days.from_now
    save!
    session_token
  end

  def session_valid?
    session_token.present? && session_expires_at.present? && Time.current < session_expires_at
  end

  def invalidate_session!
    update!(session_token: nil, session_expires_at: nil)
  end

  # Instance methods
  def display_name
    name.presence || phone_display
  end

  def phone_display
    return "" unless phone_number
    # Format: +91 98765 43210
    "+91 #{phone_number[0..4]} #{phone_number[5..9]}"
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

  def normalize_phone_number
    return unless phone_number_changed?

    # Remove all non-digits
    digits = phone_number.to_s.gsub(/\D/, '')

    # Remove leading 0 or country code 91
    digits = digits[1..] if digits.start_with?('0')
    digits = digits[2..] if digits.start_with?('91') && digits.length > 10

    self.phone_number = digits
  end

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
