# frozen_string_literal: true

class Invoice < ApplicationRecord
  belongs_to :user
  belongs_to :account, optional: true
  belongs_to :matched_transaction, class_name: 'Transaction', optional: true

  has_one_attached :file

  # Callbacks
  before_save :sanitize_extracted_data

  # Validations
  validates :source, presence: true, inclusion: { in: %w[upload gmail] }
  validates :status, presence: true, inclusion: {
    in: %w[pending processing extracted matched unmatched failed]
  }
  validates :total_amount, numericality: { greater_than: 0 }, allow_nil: true
  validates :currency, inclusion: { in: %w[INR USD EUR GBP] }, allow_nil: true
  validates :gmail_message_id, uniqueness: { scope: :user_id }, allow_nil: true
  validates :vendor_gstin, format: {
    with: /\A\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\z/,
    message: 'is not a valid GSTIN format'
  }, allow_blank: true

  # Scopes
  scope :pending_extraction, -> { where(status: 'pending') }
  scope :processing, -> { where(status: 'processing') }
  scope :extracted, -> { where(status: 'extracted') }
  scope :matched, -> { where(status: 'matched') }
  scope :unmatched, -> { where(status: 'unmatched') }
  scope :failed, -> { where(status: 'failed') }
  scope :by_source, ->(source) { where(source: source) }
  scope :from_gmail, -> { where(source: 'gmail') }
  scope :from_upload, -> { where(source: 'upload') }
  scope :pending_match, -> { where(status: 'extracted') }
  scope :recent, -> { order(created_at: :desc) }

  # State machine methods
  def pending?
    status == 'pending'
  end

  def processing?
    status == 'processing'
  end

  def extracted?
    status == 'extracted'
  end

  def matched?
    status == 'matched'
  end

  def unmatched?
    status == 'unmatched'
  end

  def failed?
    status == 'failed'
  end

  def can_extract?
    pending?
  end

  def can_match?
    extracted? && total_amount.present?
  end

  # State transitions
  def mark_processing!
    update!(status: 'processing')
  end

  def mark_extracted!(data)
    update!(
      status: 'extracted',
      vendor_name: data[:vendor_name],
      vendor_gstin: data[:vendor_gstin],
      invoice_number: data[:invoice_number],
      invoice_date: data[:invoice_date],
      total_amount: data[:total_amount],
      currency: data[:currency] || 'INR',
      extracted_data: data[:raw_data] || {},
      extraction_method: data[:method],
      extraction_confidence: data[:confidence]
    )
  end

  def mark_matched!(transaction, confidence:, method: 'auto')
    # Performance: Use with_lock to prevent race conditions
    ActiveRecord::Base.transaction do
      transaction.with_lock do
        # Security: Verify transaction belongs to same user
        raise ActiveRecord::RecordInvalid, 'Transaction user mismatch' if transaction.user_id != user_id

        update!(
          status: 'matched',
          matched_transaction_id: transaction.id,
          match_confidence: confidence,
          matched_at: Time.current,
          matched_by: method
        )
        transaction.update!(invoice_id: id)
      end
    end
  end

  def mark_unmatched!
    update!(status: 'unmatched')
  end

  def mark_failed!(error_message = nil)
    new_extracted_data = extracted_data || {}
    # Security: Don't log full error messages that might contain sensitive info
    safe_error = error_message&.truncate(500) if error_message
    new_extracted_data['error'] = safe_error
    new_extracted_data['failed_at'] = Time.current.iso8601

    update!(
      status: 'failed',
      extracted_data: new_extracted_data
    )
  end

  def unlink_transaction!
    return unless matched_transaction

    ActiveRecord::Base.transaction do
      matched_transaction.update!(invoice_id: nil)
      update!(
        status: 'extracted',
        matched_transaction_id: nil,
        match_confidence: nil,
        matched_at: nil,
        matched_by: nil
      )
    end
  end

  # File helpers
  def file_url
    return nil unless file.attached?
    Rails.application.routes.url_helpers.rails_blob_path(file, only_path: true)
  end

  def file_content_type
    file.content_type if file.attached?
  end

  def pdf?
    file_content_type&.include?('pdf')
  end

  def image?
    file_content_type&.start_with?('image/')
  end

  private

  # Remove null characters and other problematic Unicode from all text fields
  # PostgreSQL cannot store \u0000 (null bytes) in text/jsonb fields
  def sanitize_extracted_data
    # Sanitize JSON field
    self.extracted_data = deep_sanitize(extracted_data) if extracted_data.present?

    # Sanitize string fields that might contain extracted text
    self.vendor_name = sanitize_string(vendor_name) if vendor_name.present?
    self.vendor_gstin = sanitize_string(vendor_gstin) if vendor_gstin.present?
    self.invoice_number = sanitize_string(invoice_number) if invoice_number.present?
  end

  def deep_sanitize(obj)
    case obj
    when Hash
      obj.transform_values { |v| deep_sanitize(v) }
    when Array
      obj.map { |v| deep_sanitize(v) }
    when String
      sanitize_string(obj)
    else
      obj
    end
  end

  def sanitize_string(str)
    return str unless str.is_a?(String)

    # Remove null bytes and other control characters (except newlines, tabs)
    str.gsub(/\u0000/, '').gsub(/[\x00-\x08\x0B\x0C\x0E-\x1F]/, '')
  end
end
