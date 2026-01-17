# frozen_string_literal: true

module SalesInvoices
  # Handles invoice creation with line items
  # Extracts creation logic from the controller (SRP)
  # Uses Result pattern for clean error handling
  # Dependency Inversion: Injects line item builder for testability
  class CreatorService
    Result = Struct.new(:success?, :invoice, :errors, keyword_init: true)

    PERMITTED_INVOICE_ATTRS = %i[
      invoice_date due_date currency exchange_rate exchange_rate_date
      discount_amount discount_type tax_type cgst_rate sgst_rate igst_rate
      place_of_supply is_reverse_charge cess_rate notes terms
      primary_color secondary_color custom_fields
    ].freeze

    attr_reader :user, :workspace, :client, :params, :line_item_builder

    def initialize(user:, workspace:, client:, params:, line_item_builder: LineItemBuilder.new)
      @user = user
      @workspace = workspace
      @client = client
      @params = params
      @line_item_builder = line_item_builder
    end

    def call
      validate_business_profile!

      invoice = build_invoice
      add_line_items(invoice)

      if invoice.save
        success_result(invoice)
      else
        error_result(invoice.errors.full_messages)
      end
    rescue ActiveRecord::RecordInvalid => e
      error_result(e.record.errors.full_messages)
    rescue BusinessProfileRequiredError => e
      error_result([e.message])
    end

    private

    class BusinessProfileRequiredError < StandardError; end

    def validate_business_profile!
      raise BusinessProfileRequiredError, 'Business profile required to create invoices' unless business_profile
    end

    def business_profile
      @business_profile ||= workspace.business_profile
    end

    def build_invoice
      invoice_attrs = params.slice(*PERMITTED_INVOICE_ATTRS)

      user.sales_invoices.build(
        invoice_attrs.merge(
          workspace: workspace,
          client: client,
          business_profile: business_profile,
          status: 'draft'
        )
      )
    end

    def add_line_items(invoice)
      line_items_params = params[:line_items] || []
      line_item_builder.build_for_invoice(invoice, line_items_params)
    end

    def success_result(invoice)
      Result.new(success?: true, invoice: invoice, errors: [])
    end

    def error_result(errors)
      Result.new(success?: false, invoice: nil, errors: errors)
    end
  end
end
