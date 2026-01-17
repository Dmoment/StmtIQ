# frozen_string_literal: true

module SalesInvoices
  # Handles invoice updates with line items management
  # Extracts update logic from the controller (SRP)
  # Handles line item additions, updates, and deletions atomically
  # Dependency Inversion: Injects line item builder for testability
  class UpdaterService
    Result = Struct.new(:success?, :invoice, :errors, keyword_init: true)

    PERMITTED_INVOICE_ATTRS = %i[
      invoice_date due_date currency exchange_rate exchange_rate_date
      discount_amount discount_type tax_type cgst_rate sgst_rate igst_rate
      place_of_supply is_reverse_charge cess_rate notes terms
      primary_color secondary_color custom_fields
    ].freeze

    attr_reader :invoice, :params, :client_scope, :line_item_builder

    def initialize(invoice:, params:, client_scope: nil, line_item_builder: LineItemBuilder.new)
      @invoice = invoice
      @params = params
      @client_scope = client_scope
      @line_item_builder = line_item_builder
    end

    def call
      ActiveRecord::Base.transaction do
        update_invoice_attrs
        update_client if params[:client_id].present?
        update_line_items if params[:line_items].present?

        invoice.save!
      end

      success_result(invoice.reload)
    rescue ActiveRecord::RecordInvalid => e
      error_result(e.record.errors.full_messages)
    rescue ActiveRecord::RecordNotFound
      error_result(['Client not found'])
    end

    private

    def update_invoice_attrs
      update_attrs = params.slice(*PERMITTED_INVOICE_ATTRS)
      invoice.assign_attributes(update_attrs)
    end

    def update_client
      # Security: Use scoped query to prevent IDOR
      new_client = find_scoped_client
      invoice.client = new_client
    end

    def find_scoped_client
      client_scope&.find(params[:client_id]) ||
        invoice.workspace.clients.find(params[:client_id])
    end

    def update_line_items
      line_items_params = params[:line_items]

      remove_deleted_line_items(line_items_params)
      process_line_items(line_items_params)
    end

    def remove_deleted_line_items(line_items_params)
      # Collect IDs of items to keep
      existing_ids = line_items_params.filter_map { |item| item[:id] }

      # Remove line items not in the update (bulk delete for performance)
      invoice.line_items.where.not(id: existing_ids).delete_all
    end

    def process_line_items(line_items_params)
      line_items_params.each_with_index do |item_params, index|
        process_line_item(item_params, index)
      end
    end

    def process_line_item(item_params, index)
      if item_params[:id].present?
        update_existing_line_item(item_params, index)
      else
        create_new_line_item(item_params, index)
      end
    end

    def update_existing_line_item(item_params, index)
      line_item = invoice.line_items.find_by(id: item_params[:id])
      return unless line_item

      if item_params[:_destroy]
        line_item.destroy
      else
        line_item_builder.update_line_item(line_item, item_params, index)
      end
    end

    def create_new_line_item(item_params, index)
      line_item_builder.build_for_invoice(invoice, [item_params])
      # Update position for the newly created item
      invoice.line_items.last&.update_column(:position, index)
    end

    def success_result(invoice)
      Result.new(success?: true, invoice: invoice, errors: [])
    end

    def error_result(errors)
      Result.new(success?: false, invoice: nil, errors: errors)
    end
  end
end
