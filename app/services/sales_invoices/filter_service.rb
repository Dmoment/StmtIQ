# frozen_string_literal: true

module SalesInvoices
  # Handles filtering and querying of sales invoices
  # Extracts query building logic from the controller (SRP)
  class FilterService
    ALLOWED_FILTERS = %i[status client_id from_date to_date].freeze

    attr_reader :scope, :filters

    def initialize(scope, filters = {})
      @scope = scope
      @filters = filters.slice(*ALLOWED_FILTERS)
    end

    def call
      result = scope.includes(:client, :line_items).recent

      result = apply_status_filter(result)
      result = apply_client_filter(result)
      result = apply_date_range_filter(result)

      result
    end

    private

    def apply_status_filter(relation)
      return relation unless filters[:status].present?

      relation.where(status: filters[:status])
    end

    def apply_client_filter(relation)
      return relation unless filters[:client_id].present?

      relation.where(client_id: filters[:client_id])
    end

    def apply_date_range_filter(relation)
      result = relation

      if filters[:from_date].present?
        result = result.where('invoice_date >= ?', filters[:from_date])
      end

      if filters[:to_date].present?
        result = result.where('invoice_date <= ?', filters[:to_date])
      end

      result
    end
  end
end
