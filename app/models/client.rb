# frozen_string_literal: true

class Client < ApplicationRecord
  include WorkspaceScoped

  # Associations
  belongs_to :user
  has_many :sales_invoices, dependent: :restrict_with_error
  has_many :recurring_invoices, dependent: :restrict_with_error

  # Active Storage
  has_one_attached :logo

  # Validations
  validates :name, presence: true, length: { maximum: 200 }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validates :gstin, format: {
    with: /\A\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\z/,
    message: 'is not a valid GSTIN format (e.g., 22AAAAA0000A1Z5)'
  }, allow_blank: true
  validates :pan, format: {
    with: /\A[A-Z]{5}\d{4}[A-Z]\z/,
    message: 'is not a valid PAN format (e.g., ABCDE1234F)'
  }, allow_blank: true
  validates :default_currency, inclusion: { in: %w[INR USD EUR GBP] }
  validates :billing_state_code, length: { is: 2 }, allow_blank: true
  validates :shipping_state_code, length: { is: 2 }, allow_blank: true
  validates :billing_pincode, format: { with: /\A\d{6}\z/, message: 'must be 6 digits' }, allow_blank: true
  validates :shipping_pincode, format: { with: /\A\d{6}\z/, message: 'must be 6 digits' }, allow_blank: true

  # Scopes
  scope :active, -> { where(is_active: true) }
  scope :with_gstin, -> { where.not(gstin: [nil, '']) }
  scope :recent, -> { order(created_at: :desc) }
  scope :alphabetical, -> { order(:name) }
  scope :search, ->(query) {
    where('name ILIKE :q OR email ILIKE :q OR company_name ILIKE :q', q: "%#{query}%")
  }

  # Callbacks
  before_save :extract_state_code_from_gstin

  # Instance Methods
  def display_name
    company_name.presence || name
  end

  def full_billing_address
    [billing_address_line1, billing_address_line2, billing_city,
     "#{billing_state} - #{billing_pincode}", billing_country]
      .compact_blank
      .join(', ')
  end

  def full_shipping_address
    return nil if shipping_address_line1.blank?

    [shipping_address_line1, shipping_address_line2, shipping_city,
     "#{shipping_state} - #{shipping_pincode}", shipping_country]
      .compact_blank
      .join(', ')
  end

  def has_shipping_address?
    shipping_address_line1.present?
  end

  def state_code
    billing_state_code
  end

  def total_invoiced
    sales_invoices.sum(:total_amount)
  end

  def total_paid
    sales_invoices.sum(:amount_paid)
  end

  def total_outstanding
    sales_invoices.where(status: %w[sent viewed overdue]).sum(:balance_due)
  end

  def logo_url
    return nil unless logo.attached?

    # Generate a signed URL for inline display (not download)
    logo.url(
      expires_in: 1.hour,
      disposition: 'inline',
      content_type: logo.content_type
    )
  end

  private

  def extract_state_code_from_gstin
    return unless gstin.present? && billing_state_code.blank?

    self.billing_state_code = gstin[0..1]
  end
end
