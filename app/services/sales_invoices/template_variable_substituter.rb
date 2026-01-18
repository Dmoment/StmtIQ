# frozen_string_literal: true

module SalesInvoices
  # Single Responsibility: Handle template variable substitution
  class TemplateVariableSubstituter
    VARIABLE_PATTERN = /\{(invoice_number|business_name|client_name|due_date|amount)\}/

    def initialize(invoice)
      @invoice = invoice
      @client = invoice.client
      @profile = invoice.business_profile
    end

    def substitute(template)
      return '' if template.blank?

      template.gsub(VARIABLE_PATTERN) { |match| variable_value(match) }
    end

    private

    attr_reader :invoice, :client, :profile

    def variable_value(variable_name)
      case variable_name
      when '{invoice_number}'
        invoice.invoice_number.to_s
      when '{business_name}'
        profile.business_name.to_s
      when '{client_name}'
        client.display_name.to_s
      when '{due_date}'
        invoice.due_date&.strftime('%d %b %Y').to_s
      when '{amount}'
        format_currency(invoice.total_amount)
      else
        variable_name
      end
    end

    def format_currency(amount)
      return '' if amount.blank?

      "#{invoice.currency} #{ActionController::Base.helpers.number_with_delimiter(amount, delimiter: ',')}"
    end
  end
end
