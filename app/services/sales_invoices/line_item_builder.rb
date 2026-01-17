# frozen_string_literal: true

module SalesInvoices
  # Builds and sanitizes invoice line items
  # Single Responsibility: Line item construction only
  # Open/Closed: Extensible for different line item types
  class LineItemBuilder
    SANITIZABLE_FIELDS = %i[description hsn_sac_code unit].freeze
    DEFAULT_QUANTITY = 1
    DEFAULT_UNIT = 'units'
    DEFAULT_GST_RATE = 18

    attr_reader :sanitizer

    def initialize(sanitizer: TextSanitizer.new)
      @sanitizer = sanitizer
    end

    def build_for_invoice(invoice, line_items_params)
      return if line_items_params.blank?

      line_items_params.each_with_index do |item_params, index|
        invoice.line_items.build(
          build_attributes(item_params, index)
        )
      end
    end

    def update_line_item(line_item, item_params, position)
      line_item.update!(
        build_attributes(item_params, position)
      )
    end

    private

    def build_attributes(item_params, position)
      {
        description: sanitize_field(item_params[:description]),
        hsn_sac_code: sanitize_field(item_params[:hsn_sac_code]),
        quantity: item_params[:quantity] || DEFAULT_QUANTITY,
        unit: sanitize_field(item_params[:unit]) || DEFAULT_UNIT,
        rate: item_params[:rate],
        gst_rate: item_params[:gst_rate] || DEFAULT_GST_RATE,
        position: position
      }
    end

    def sanitize_field(value)
      sanitizer.sanitize(value)
    end
  end
end
