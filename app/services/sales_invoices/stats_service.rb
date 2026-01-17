# frozen_string_literal: true

module SalesInvoices
  # Calculates invoice statistics efficiently
  # Uses single database queries to avoid N+1 issues
  # Extracts statistics logic from the controller (SRP)
  class StatsService
    attr_reader :scope

    def initialize(scope)
      @scope = scope
    end

    def call
      # Use a single query with grouping to minimize database calls
      stats = fetch_aggregated_stats

      {
        total: stats[:total_count],
        total_amount: stats[:total_amount] || 0,
        total_paid: stats[:paid_amount] || 0,
        total_outstanding: stats[:outstanding_balance] || 0,
        by_status: build_status_breakdown(stats[:status_counts], stats[:status_amounts])
      }
    end

    private

    def fetch_aggregated_stats
      # Perform aggregations in a single database roundtrip where possible
      total_count = scope.count
      total_amount = scope.sum(:total_amount)
      paid_amount = scope.paid.sum(:total_amount)
      outstanding_balance = scope.outstanding.sum(:balance_due)

      status_counts = scope.group(:status).count
      status_amounts = scope.group(:status).sum(:total_amount)

      {
        total_count: total_count,
        total_amount: total_amount,
        paid_amount: paid_amount,
        outstanding_balance: outstanding_balance,
        status_counts: status_counts,
        status_amounts: status_amounts
      }
    end

    def build_status_breakdown(status_counts, status_amounts)
      SalesInvoice::STATUSES.each_with_object({}) do |status, hash|
        hash[status] = {
          count: status_counts[status] || 0,
          amount: status_amounts[status] || 0
        }
      end
    end
  end
end
