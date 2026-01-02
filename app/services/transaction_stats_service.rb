# frozen_string_literal: true

# Service to compute transaction statistics
# Follows SOLID principles by separating stats computation from API endpoint
class TransactionStatsService
  def initialize(transactions, detailed: false, statement_id: nil, user: nil)
    @transactions = transactions
    @detailed = detailed
    @statement_id = statement_id
    @user = user
  end

  def call
    base_stats = compute_base_stats

    if @detailed
      base_stats.merge(compute_detailed_analytics)
    else
      base_stats
    end
  end

  private

  attr_reader :transactions

  # Compute base stats efficiently with minimal queries
  # Uses single aggregated query where possible to avoid multiple count/sum calls
  def compute_base_stats
    # Single query to get all counts and sums by type
    # This avoids multiple separate queries
    aggregated = transactions
      .reorder(nil)
      .select(
        "COUNT(*) as total_count",
        "SUM(amount) FILTER (WHERE transaction_type = 'debit') as total_debits",
        "SUM(amount) FILTER (WHERE transaction_type = 'credit') as total_credits",
        "COUNT(*) FILTER (WHERE transaction_type = 'debit') as debit_count",
        "COUNT(*) FILTER (WHERE transaction_type = 'credit') as credit_count",
        "COUNT(*) FILTER (WHERE category_id IS NULL) as uncategorized_count"
      )
      .take

    total_debits = aggregated&.total_debits.to_f || 0.0
    total_credits = aggregated&.total_credits.to_f || 0.0
    total_count = aggregated&.total_count.to_i

    {
      total_transactions: total_count,
      total_debits: total_debits,
      total_credits: total_credits,
      net: total_credits - total_debits,
      # FIX: Only include debits for by_category (spending by category)
      by_category: transactions.debits.group(:category_id).sum(:amount),
      by_type: {
        debit: aggregated&.debit_count.to_i,
        credit: aggregated&.credit_count.to_i
      },
      uncategorized_count: aggregated&.uncategorized_count.to_i
    }
  end

  # Compute detailed analytics (either from cache or on-the-fly)
  def compute_detailed_analytics
    if @statement_id.present?
      compute_statement_analytics
    else
      compute_aggregate_analytics
    end
  end

  # Get analytics for a specific statement (from cache or trigger computation)
  def compute_statement_analytics
    # Multi-tenant safety: ensure statement belongs to user
    statement = @user ? @user.statements.find_by(id: @statement_id) : Statement.find_by(id: @statement_id)
    return analytics_placeholder unless statement

    # Only compute analytics for parsed statements
    return analytics_placeholder unless statement.parsed?

    analytic = statement.statement_analytic

    # Return cached analytics if fresh
    if analytic&.fresh?
      return analytic.to_analytics_hash
    end

    # Prevent job spam: only enqueue if not already queued/running
    if should_enqueue_analytics?(analytic)
      # Mark as queued before enqueueing to prevent duplicates
      analytic ||= StatementAnalytic.find_or_initialize_by(statement_id: statement.id)
      analytic.update!(status: :queued) unless analytic.queued?
      AnalyticsComputeJob.perform_later(statement.id)
    end

    analytics_placeholder
  end

  # Compute aggregate analytics across all statements
  def compute_aggregate_analytics
    # For small datasets, compute on-the-fly
    # For large datasets, return placeholder (future: account-level analytics)
    total_count = transactions.count

    if total_count < 1000
      # Small dataset, OK to compute on-the-fly
      TransactionAnalyticsService.new(transactions).call
    else
      # Large dataset, return placeholder
      # TODO: Implement account-level analytics cache
      analytics_placeholder
    end
  end

  # Check if we should enqueue analytics computation
  # Prevents duplicate job enqueueing
  def should_enqueue_analytics?(analytic)
    return true unless analytic

    # Don't enqueue if already computed recently or currently running
    !analytic.fresh? && !analytic.running? && !analytic.queued?
  end

  # Placeholder analytics when computation is in progress or not available
  def analytics_placeholder
    {
      monthly_spend: [],
      top_categories: [],
      top_merchants: [],
      recurring_expenses: { total_monthly: 0, items: [] },
      silent_drains: [],
      weekend_vs_weekday: {},
      largest_expense: nil,
      income_expense_ratio: { income_percent: 0, expense_percent: 0, income: 0, expense: 0 },
      analytics_loading: true
    }
  end
end
