# frozen_string_literal: true

class InvoiceLineItem < ApplicationRecord
  # Associations
  belongs_to :sales_invoice

  # Validations
  validates :description, presence: true, length: { maximum: 500 }
  validates :quantity, presence: true, numericality: { greater_than: 0 }
  validates :rate, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :position, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :tax_rate, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }, allow_nil: true
  validates :hsn_sac_code, format: { with: /\A\d{4,8}\z/, message: 'must be 4-8 digits' }, allow_blank: true

  # Scopes
  scope :ordered, -> { order(:position) }

  # Callbacks
  before_validation :set_position, on: :create
  before_validation :calculate_amount

  # Instance Methods
  def unit_display
    case unit
    when 'hrs' then 'Hours'
    when 'days' then 'Days'
    when 'units' then 'Units'
    when 'pcs' then 'Pieces'
    when 'months' then 'Months'
    when 'projects' then 'Projects'
    else unit&.titleize || 'Units'
    end
  end

  def formatted_quantity
    if quantity == quantity.to_i
      quantity.to_i.to_s
    else
      format('%.2f', quantity)
    end
  end

  private

  def set_position
    return if position.present?

    max_position = sales_invoice&.line_items&.maximum(:position) || -1
    self.position = max_position + 1
  end

  def calculate_amount
    self.amount = (quantity || 0) * (rate || 0)
  end
end
