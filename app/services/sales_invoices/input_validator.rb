# frozen_string_literal: true

module SalesInvoices
  # Validates invoice input parameters for security
  # Single Responsibility: Input validation only
  # Security: Prevents numeric overflow, negative values, and invalid ranges
  class InputValidator
    # Security: Prevent numeric overflow attacks
    MAX_AMOUNT = 999_999_999.99
    MAX_PERCENTAGE = 100
    MAX_TAX_RATE = 100
    MAX_QUANTITY = 999_999

    ValidationError = Class.new(StandardError)

    attr_reader :errors

    def initialize
      @errors = []
    end

    def validate_invoice_params(params)
      @errors = []

      validate_amounts(params)
      validate_rates(params)
      validate_dates(params)
      validate_colors(params)

      errors.empty?
    end

    def validate_line_item_params(item_params)
      @errors = []

      validate_line_item_amount(item_params)
      validate_line_item_quantity(item_params)
      validate_line_item_gst_rate(item_params)

      errors.empty?
    end

    def validate_payment_amount(amount, balance_due)
      @errors = []

      if amount.nil? || amount <= 0
        errors << 'Payment amount must be positive'
      elsif amount > balance_due
        errors << 'Payment amount exceeds balance due'
      elsif amount > MAX_AMOUNT
        errors << "Payment amount exceeds maximum allowed (#{MAX_AMOUNT})"
      end

      errors.empty?
    end

    private

    def validate_amounts(params)
      %i[discount_amount exchange_rate].each do |field|
        next unless params[field].present?

        value = params[field].to_f

        if value.negative?
          errors << "#{field.to_s.humanize} cannot be negative"
        elsif value > MAX_AMOUNT
          errors << "#{field.to_s.humanize} exceeds maximum allowed"
        end
      end
    end

    def validate_rates(params)
      %i[cgst_rate sgst_rate igst_rate cess_rate].each do |field|
        next unless params[field].present?

        rate = params[field].to_f

        if rate.negative?
          errors << "#{field.to_s.humanize} cannot be negative"
        elsif rate > MAX_TAX_RATE
          errors << "#{field.to_s.humanize} exceeds maximum allowed (#{MAX_TAX_RATE}%)"
        end
      end
    end

    def validate_dates(params)
      if params[:invoice_date] && params[:due_date]
        if params[:due_date] < params[:invoice_date]
          errors << 'Due date must be on or after invoice date'
        end
      end
    end

    def validate_colors(params)
      %i[primary_color secondary_color].each do |field|
        next unless params[field].present?

        unless valid_hex_color?(params[field])
          errors << "#{field.to_s.humanize} must be a valid hex color (e.g., #FF5733)"
        end
      end
    end

    def validate_line_item_amount(item_params)
      rate = item_params[:rate].to_f

      if rate.negative?
        errors << 'Line item rate cannot be negative'
      elsif rate > MAX_AMOUNT
        errors << 'Line item rate exceeds maximum allowed'
      end
    end

    def validate_line_item_quantity(item_params)
      return unless item_params[:quantity].present?

      quantity = item_params[:quantity].to_f

      if quantity <= 0
        errors << 'Line item quantity must be positive'
      elsif quantity > MAX_QUANTITY
        errors << 'Line item quantity exceeds maximum allowed'
      end
    end

    def validate_line_item_gst_rate(item_params)
      return unless item_params[:gst_rate].present?

      gst_rate = item_params[:gst_rate].to_f

      if gst_rate.negative?
        errors << 'GST rate cannot be negative'
      elsif gst_rate > MAX_TAX_RATE
        errors << 'GST rate exceeds maximum allowed'
      end
    end

    def valid_hex_color?(color)
      color.match?(/\A#[0-9A-Fa-f]{6}\z/)
    end
  end
end
