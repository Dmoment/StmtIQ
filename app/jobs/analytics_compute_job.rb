# frozen_string_literal: true

# Async job to compute statement analytics
# Runs after parsing completes, not in request path
class AnalyticsComputeJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: ->(executions) { executions * 2 }, attempts: 3

  def perform(statement_id)
    statement = Statement.find_by(id: statement_id)
    return unless statement&.parsed?

    return unless statement.user_id.present?

    analytic = StatementAnalytic.find_or_initialize_by(statement_id: statement_id)

    # Prevent duplicate computation: check if already running/queued
    return if analytic.running? || analytic.queued?

    # Mark as running
    analytic.update!(
      status: :running,
      started_at: Time.current,
      error_message: nil
    )

    transactions = statement.transactions
    return if transactions.empty?

    # Compute analytics
    analytics_data = TransactionAnalyticsService.new(transactions).call

    # Store results
    analytic.assign_attributes(
      status: :completed,
      computed_at: Time.current,
      monthly_spend: analytics_data[:monthly_spend],
      category_breakdown: { top_categories: analytics_data[:top_categories] },
      merchant_breakdown: { top_merchants: analytics_data[:top_merchants] },
      recurring_expenses: analytics_data[:recurring_expenses],
      silent_drains: { drains: analytics_data[:silent_drains] },
      weekend_weekday: analytics_data[:weekend_vs_weekday],
      largest_expense: analytics_data[:largest_expense] || {},
      income_expense_ratio: analytics_data[:income_expense_ratio]
    )
    analytic.save!

    Rails.logger.info("Analytics computed for statement #{statement_id}")
  rescue => e
    # Mark as failed with error message
    analytic = StatementAnalytic.find_by(statement_id: statement_id)
    if analytic
      analytic.update!(
        status: :failed,
        error_message: e.message
      )
    end

    Rails.logger.error("Failed to compute analytics for statement #{statement_id}: #{e.message}")
    raise
  end
end
