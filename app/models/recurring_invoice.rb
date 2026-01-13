# frozen_string_literal: true

class RecurringInvoice < ApplicationRecord
  include WorkspaceScoped

  # Constants
  FREQUENCIES = %w[weekly biweekly monthly quarterly yearly].freeze
  STATUSES = %w[active paused completed].freeze

  # Associations
  belongs_to :user
  belongs_to :client
  belongs_to :business_profile
  belongs_to :last_invoice, class_name: 'SalesInvoice', optional: true
  has_many :sales_invoices, dependent: :nullify

  # Validations
  validates :name, presence: true, length: { maximum: 200 }
  validates :frequency, presence: true, inclusion: { in: FREQUENCIES }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :start_date, presence: true
  validates :currency, inclusion: { in: SalesInvoice::CURRENCIES }
  validates :payment_terms_days, numericality: { greater_than_or_equal_to: 0 }
  validates :send_days_before_due, numericality: { greater_than_or_equal_to: 0 }
  validates :tax_rate, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }, allow_nil: true
  validate :end_date_after_start_date

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :paused, -> { where(status: 'paused') }
  scope :due_today, -> { active.where(next_run_date: Date.current) }
  scope :due_before, ->(date) { active.where('next_run_date <= ?', date) }
  scope :recent, -> { order(created_at: :desc) }

  # Callbacks
  before_create :set_initial_next_run_date

  # State Methods
  STATUSES.each do |status_name|
    define_method("#{status_name}?") { status == status_name }
  end

  # Actions
  def pause!
    update!(status: 'paused')
  end

  def resume!
    # Recalculate next run date when resuming
    self.next_run_date = calculate_next_run_date(Date.current)
    self.status = 'active'
    save!
  end

  def complete!
    update!(status: 'completed')
  end

  def generate_invoice!
    return nil unless can_generate?

    invoice = build_invoice
    invoice.save!

    update!(
      last_invoice_id: invoice.id,
      last_run_at: Time.current,
      invoice_count: invoice_count + 1,
      next_run_date: calculate_next_run_date(next_run_date)
    )

    check_completion!
    invoice
  end

  def can_generate?
    active? && next_run_date && next_run_date <= Date.current
  end

  def should_auto_send?
    auto_send && send_days_before_due >= 0
  end

  # Schedule Helpers
  def frequency_display
    case frequency
    when 'weekly' then 'Weekly'
    when 'biweekly' then 'Every 2 Weeks'
    when 'monthly' then 'Monthly'
    when 'quarterly' then 'Quarterly'
    when 'yearly' then 'Yearly'
    else frequency.titleize
    end
  end

  def calculate_next_run_date(from_date)
    case frequency
    when 'weekly'
      from_date + 1.week
    when 'biweekly'
      from_date + 2.weeks
    when 'monthly'
      from_date + 1.month
    when 'quarterly'
      from_date + 3.months
    when 'yearly'
      from_date + 1.year
    else
      from_date + 1.month
    end
  end

  private

  def set_initial_next_run_date
    self.next_run_date ||= start_date
  end

  def build_invoice
    invoice = SalesInvoice.new(
      workspace: workspace,
      user: user,
      client: client,
      business_profile: business_profile,
      recurring_invoice: self,
      invoice_date: Date.current,
      due_date: Date.current + payment_terms_days.days,
      currency: currency,
      notes: template_data['notes'],
      terms: template_data['terms']
    )

    # Add line items from template
    (template_data['line_items'] || []).each_with_index do |item, index|
      invoice.line_items.build(
        description: item['description'],
        hsn_sac_code: item['hsn_sac_code'],
        quantity: item['quantity'] || 1,
        unit: item['unit'] || 'units',
        rate: item['rate'] || 0,
        position: index
      )
    end

    # Set tax if configured
    if tax_rate.present? && tax_rate > 0
      invoice.tax_type = determine_tax_type
      invoice.cgst_rate = tax_rate if invoice.tax_type == 'cgst_sgst'
      invoice.igst_rate = tax_rate if invoice.tax_type == 'igst'
    end

    invoice
  end

  def determine_tax_type
    seller_state = business_profile&.state_code
    buyer_state = client&.billing_state_code

    if seller_state.present? && buyer_state.present? && seller_state == buyer_state
      'cgst_sgst'
    else
      'igst'
    end
  end

  def check_completion!
    return unless end_date.present?
    return unless next_run_date > end_date

    complete!
  end

  def end_date_after_start_date
    return unless start_date && end_date

    if end_date < start_date
      errors.add(:end_date, "must be after start date")
    end
  end
end
