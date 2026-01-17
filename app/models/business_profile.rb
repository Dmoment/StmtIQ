# frozen_string_literal: true

class BusinessProfile < ApplicationRecord
  # Associations
  belongs_to :workspace
  has_many :sales_invoices, dependent: :restrict_with_error
  has_many :recurring_invoices, dependent: :restrict_with_error

  # Active Storage
  has_one_attached :logo
  has_one_attached :signature

  # Validations
  validates :business_name, presence: true, length: { maximum: 200 }
  validates :gstin, format: {
    with: /\A\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\z/,
    message: 'is not a valid GSTIN format (e.g., 22AAAAA0000A1Z5)'
  }, allow_blank: true
  validates :pan_number, format: {
    with: /\A[A-Z]{5}\d{4}[A-Z]\z/,
    message: 'is not a valid PAN format (e.g., ABCDE1234F)'
  }, allow_blank: true
  validates :state_code, length: { is: 2 }, allow_blank: true
  validates :pincode, format: { with: /\A\d{6}\z/, message: 'must be 6 digits' }, allow_blank: true
  validates :ifsc_code, format: {
    with: /\A[A-Z]{4}0[A-Z0-9]{6}\z/,
    message: 'is not a valid IFSC format (e.g., SBIN0001234)'
  }, allow_blank: true
  validates :primary_color, format: { with: /\A#[0-9A-Fa-f]{6}\z/ }, allow_blank: true
  validates :secondary_color, format: { with: /\A#[0-9A-Fa-f]{6}\z/ }, allow_blank: true
  validates :invoice_next_number, numericality: { greater_than: 0 }
  validates :default_payment_terms_days, numericality: { greater_than_or_equal_to: 0 }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validates :workspace_id, uniqueness: true

  # Callbacks
  before_save :extract_state_code_from_gstin

  # Instance Methods
  def full_address
    [address_line1, address_line2, city, "#{state} - #{pincode}", country]
      .compact_blank
      .join(', ')
  end

  def generate_invoice_number
    number = "#{invoice_prefix}#{invoice_next_number.to_s.rjust(5, '0')}"
    increment!(:invoice_next_number)
    number
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

  def signature_url
    return nil unless signature.attached?

    # Generate a signed URL for inline display (not download)
    signature.url(
      expires_in: 1.hour,
      disposition: 'inline',
      content_type: signature.content_type
    )
  end

  private

  def extract_state_code_from_gstin
    return unless gstin.present? && state_code.blank?

    self.state_code = gstin[0..1]
  end
end
