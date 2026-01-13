# frozen_string_literal: true

class SalesInvoice < ApplicationRecord
  include WorkspaceScoped

  # Constants
  STATUSES = %w[draft sent viewed paid partially_paid overdue cancelled].freeze
  CURRENCIES = %w[INR USD EUR GBP].freeze
  TAX_TYPES = %w[none cgst_sgst igst].freeze
  DISCOUNT_TYPES = %w[fixed percentage].freeze

  # Associations
  belongs_to :user
  belongs_to :client
  belongs_to :business_profile
  belongs_to :recurring_invoice, optional: true
  belongs_to :matched_transaction, class_name: 'Transaction', optional: true
  has_many :line_items, class_name: 'InvoiceLineItem', dependent: :destroy

  # Active Storage
  has_one_attached :pdf_file

  # Nested Attributes
  accepts_nested_attributes_for :line_items, allow_destroy: true, reject_if: :all_blank

  # Validations
  validates :invoice_number, presence: true, uniqueness: { scope: :workspace_id }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :invoice_date, presence: true
  validates :due_date, presence: true
  validates :currency, presence: true, inclusion: { in: CURRENCIES }
  validates :discount_type, inclusion: { in: DISCOUNT_TYPES }, allow_nil: true
  validates :tax_type, inclusion: { in: TAX_TYPES }, allow_nil: true
  validates :exchange_rate, numericality: { greater_than: 0 }
  validates :subtotal, :total_amount, :amount_paid, :balance_due,
            numericality: { greater_than_or_equal_to: 0 }
  validates :primary_color, format: { with: /\A#[0-9A-Fa-f]{6}\z/ }, allow_blank: true
  validates :secondary_color, format: { with: /\A#[0-9A-Fa-f]{6}\z/ }, allow_blank: true
  validate :due_date_after_invoice_date

  # Scopes
  scope :draft, -> { where(status: 'draft') }
  scope :sent, -> { where(status: 'sent') }
  scope :viewed, -> { where(status: 'viewed') }
  scope :paid, -> { where(status: 'paid') }
  scope :partially_paid, -> { where(status: 'partially_paid') }
  scope :overdue, -> { where(status: 'overdue') }
  scope :cancelled, -> { where(status: 'cancelled') }
  scope :outstanding, -> { where(status: %w[sent viewed overdue partially_paid]) }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_date, -> { order(invoice_date: :desc) }
  scope :for_period, ->(start_date, end_date) {
    where(invoice_date: start_date..end_date)
  }

  # Callbacks
  before_validation :set_defaults, on: :create
  before_save :calculate_totals
  after_save :check_overdue_status

  # State Methods
  STATUSES.each do |status_name|
    define_method("#{status_name}?") { status == status_name }
  end

  def can_edit?
    draft?
  end

  def can_send?
    draft? || sent?
  end

  def can_record_payment?
    %w[sent viewed overdue partially_paid].include?(status)
  end

  # Actions
  def mark_sent!
    update!(status: 'sent', sent_at: Time.current)
  end

  def mark_viewed!
    return unless sent?

    update!(status: 'viewed', viewed_at: Time.current)
  end

  def record_payment!(amount)
    new_amount_paid = self.amount_paid + amount
    new_balance = total_amount - new_amount_paid

    new_status = if new_balance <= 0
                   'paid'
                 elsif new_amount_paid > 0
                   'partially_paid'
                 else
                   status
                 end

    update!(
      amount_paid: new_amount_paid,
      balance_due: [new_balance, 0].max,
      status: new_status,
      paid_at: new_status == 'paid' ? Time.current : paid_at
    )
  end

  def cancel!
    update!(status: 'cancelled')
  end

  def duplicate
    new_invoice = dup
    new_invoice.invoice_number = nil
    new_invoice.status = 'draft'
    new_invoice.invoice_date = Date.current
    new_invoice.due_date = Date.current + (business_profile&.default_payment_terms_days || 30).days
    new_invoice.sent_at = nil
    new_invoice.viewed_at = nil
    new_invoice.paid_at = nil
    new_invoice.pdf_generated_at = nil
    new_invoice.amount_paid = 0
    new_invoice.recurring_invoice_id = nil
    new_invoice.matched_transaction_id = nil

    line_items.each do |item|
      new_invoice.line_items.build(item.attributes.except('id', 'sales_invoice_id', 'created_at', 'updated_at'))
    end

    new_invoice
  end

  # Calculations
  def calculate_totals
    self.subtotal = line_items.sum(&:amount)

    discount = if discount_type == 'percentage'
                 subtotal * (discount_amount / 100.0)
               else
                 discount_amount || 0
               end

    taxable_amount = subtotal - discount

    calculate_tax(taxable_amount)

    self.total_amount = taxable_amount + tax_total
    self.balance_due = total_amount - amount_paid
  end

  def tax_total
    (cgst_amount || 0) + (sgst_amount || 0) + (igst_amount || 0)
  end

  def amount_in_inr
    total_amount * exchange_rate
  end

  # Display Helpers
  def effective_primary_color
    primary_color.presence || business_profile&.primary_color || '#f59e0b'
  end

  def effective_secondary_color
    secondary_color.presence || business_profile&.secondary_color || '#1e293b'
  end

  def days_until_due
    (due_date - Date.current).to_i
  end

  def days_overdue
    return 0 unless due_date < Date.current

    (Date.current - due_date).to_i
  end

  private

  def set_defaults
    self.invoice_number ||= business_profile&.generate_invoice_number
    self.invoice_date ||= Date.current
    self.due_date ||= invoice_date + (business_profile&.default_payment_terms_days || 30).days
    self.notes ||= business_profile&.default_notes
    self.terms ||= business_profile&.default_terms
    self.exchange_rate ||= 1.0
    self.amount_paid ||= 0
  end

  def calculate_tax(taxable_amount)
    return reset_tax_amounts if tax_type.blank? || tax_type == 'none'

    rate = cgst_rate || sgst_rate || igst_rate || 18.0

    if tax_type == 'cgst_sgst'
      half_rate = rate / 2.0
      half_tax = (taxable_amount * half_rate / 100.0).round(2)
      self.cgst_rate = half_rate
      self.cgst_amount = half_tax
      self.sgst_rate = half_rate
      self.sgst_amount = half_tax
      self.igst_rate = nil
      self.igst_amount = 0
    else # igst
      self.igst_rate = rate
      self.igst_amount = (taxable_amount * rate / 100.0).round(2)
      self.cgst_rate = nil
      self.cgst_amount = 0
      self.sgst_rate = nil
      self.sgst_amount = 0
    end
  end

  def reset_tax_amounts
    self.cgst_rate = nil
    self.cgst_amount = 0
    self.sgst_rate = nil
    self.sgst_amount = 0
    self.igst_rate = nil
    self.igst_amount = 0
  end

  def due_date_after_invoice_date
    return unless invoice_date && due_date

    if due_date < invoice_date
      errors.add(:due_date, "must be on or after invoice date")
    end
  end

  def check_overdue_status
    return unless saved_change_to_attribute?(:due_date) || saved_change_to_attribute?(:status)
    return unless %w[sent viewed].include?(status)
    return unless due_date < Date.current

    update_column(:status, 'overdue')
  end
end
