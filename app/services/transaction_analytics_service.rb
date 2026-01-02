# frozen_string_literal: true

# Optimized analytics service that uses SQL instead of Ruby loops
# Designed to run asynchronously, not in request path
class TransactionAnalyticsService
  def initialize(transactions)
    @transactions = transactions
  end

  def call
    {
      monthly_spend: monthly_spend_breakdown,
      top_categories: top_spending_categories,
      top_merchants: top_merchants_by_spend,
      income_expense_ratio: income_vs_expense_ratio,
      recurring_expenses: recurring_expenses_detected,
      silent_drains: silent_drains_analysis,
      largest_expense: largest_single_expense,
      weekend_vs_weekday: weekend_vs_weekday_spend
    }
  end

  private

  attr_reader :transactions

  # Monthly spend breakdown - OPTIMIZED: Single query with GROUP BY
  def monthly_spend_breakdown
    # Use SQL DATE_TRUNC for efficient grouping
    debits = transactions.debits

    # Get last 12 months range
    start_date = 11.months.ago.beginning_of_month
    end_date = Date.today.end_of_month

    # Single query with GROUP BY month
    # Remove any default ordering before GROUP BY
    monthly_data = debits
      .where(transaction_date: start_date..end_date)
      .reorder(nil) # Remove any default ORDER BY
      .group("DATE_TRUNC('month', transaction_date)")
      .select(
        "DATE_TRUNC('month', transaction_date) as month",
        "SUM(amount) as total_amount",
        "COUNT(*) as transaction_count"
      )
      .order('month DESC')
      .limit(12)

    # Build hash for fast lookup
    monthly_hash = monthly_data.index_by { |r| r.month.to_date.beginning_of_month }

    # Fill in all 12 months (even if no data)
    (0..11).map do |i|
      month_start = (Date.today - i.months).beginning_of_month
      month_data = monthly_hash[month_start]

      {
        month: month_start.strftime('%b %Y'),
        month_key: month_start.strftime('%Y-%m'),
        amount: month_data ? month_data.total_amount.to_f : 0.0,
        transaction_count: month_data ? month_data.transaction_count : 0
      }
    end.reverse
  end

  # Top spending categories - OPTIMIZED: Pure SQL with JOIN
  def top_spending_categories
    debits = transactions.debits

    # Single query with JOIN and aggregation
    # Remove any default ordering before GROUP BY
    category_totals = debits
      .where.not(category_id: nil)
      .joins(:category)
      .reorder(nil) # Remove any default ORDER BY
      .group('categories.id', 'categories.name', 'categories.color', 'categories.icon')
      .select(
        'categories.id',
        'categories.name',
        'categories.color',
        'categories.icon',
        'SUM(transactions.amount) as total_amount',
        'COUNT(transactions.id) as transaction_count'
      )
      .order('total_amount DESC')
      .limit(10)

    category_totals.map do |row|
      {
        id: row.id,
        name: row.name,
        amount: row.total_amount.to_f,
        color: row.color,
        icon: row.icon,
        transaction_count: row.transaction_count
      }
    end
  end

  # Top merchants by spend - MUST stay async (string processing)
  # This is the one that requires Ruby iteration, but it's async so OK
  def top_merchants_by_spend
    debits = transactions.debits.select(:id, :description, :amount)

    # Still need Ruby for merchant extraction, but limit to essential fields
    merchant_totals = {}

    debits.find_each(batch_size: 1000) do |tx|
      merchant = extract_merchant_name(tx.description)
      next if merchant.blank?

      merchant_totals[merchant] ||= { amount: 0.0, count: 0 }
      merchant_totals[merchant][:amount] += tx.amount.to_f
      merchant_totals[merchant][:count] += 1
    end

    merchant_totals
      .sort_by { |_k, v| -v[:amount] }
      .first(10)
      .map do |merchant, data|
        {
          name: merchant,
          amount: data[:amount],
          transaction_count: data[:count]
        }
      end
  end

  # Income vs Expense ratio - OPTIMIZED: Direct sum queries
  def income_vs_expense_ratio
    # Use direct sum queries to avoid GROUP BY issues
    total_credits = transactions.credits.sum(:amount).to_f
    total_debits = transactions.debits.sum(:amount).to_f
    total = total_credits + total_debits

    return { income_percent: 0, expense_percent: 0, income: 0, expense: 0 } if total.zero?

    {
      income_percent: ((total_credits / total) * 100).round(1),
      expense_percent: ((total_debits / total) * 100).round(1),
      income: total_credits,
      expense: total_debits
    }
  end

  # Recurring expenses detected - MUST stay async (pattern matching)
  def recurring_expenses_detected
    debits = transactions.debits.select(:id, :description, :amount, :transaction_date, :category_id)

    # Group by normalized description pattern
    recurring_patterns = {}

    debits.find_each(batch_size: 1000) do |tx|
      normalized_desc = normalize_description_for_recurring(tx.description)
      next if normalized_desc.blank?

      recurring_patterns[normalized_desc] ||= {
        description: tx.description,
        category_id: tx.category_id,
        amounts: [],
        dates: [],
        count: 0
      }

      recurring_patterns[normalized_desc][:amounts] << tx.amount.to_f
      recurring_patterns[normalized_desc][:dates] << tx.transaction_date
      recurring_patterns[normalized_desc][:count] += 1
    end

    # Filter for likely recurring (appears 3+ times with similar amounts)
    recurring = recurring_patterns.select do |_pattern, data|
      data[:count] >= 3 && similar_amounts?(data[:amounts])
    end

    # Get category names in batch
    category_ids = recurring.values.map { |d| d[:category_id] }.compact.uniq
    categories = Category.where(id: category_ids).index_by(&:id)

    recurring_list = recurring.map do |_pattern, data|
      {
        description: data[:description],
        category: categories[data[:category_id]]&.name,
        monthly_average: (data[:amounts].sum / data[:count]).round(2),
        frequency: data[:count],
        last_date: data[:dates].max
      }
    end.sort_by { |item| -item[:monthly_average] }.first(10)

    {
      total_monthly: recurring_list.sum { |item| item[:monthly_average] },
      items: recurring_list
    }
  end

  # Silent drains - OPTIMIZED: SQL aggregation
  def silent_drains_analysis
    debits = transactions.debits

    # Use SQL aggregation instead of Ruby loops
    thresholds = [
      { max: 200, label: 'Under ₹200' },
      { max: 500, label: 'Under ₹500' }
    ]

    thresholds.map do |threshold|
      # Remove any default ordering before aggregation
      result = debits
        .where('amount <= ?', threshold[:max])
        .reorder(nil) # Remove any default ORDER BY
        .select('SUM(amount) as total_amount, COUNT(*) as transaction_count')
        .take

      next {
        label: threshold[:label],
        max_amount: threshold[:max],
        total_amount: 0,
        transaction_count: 0,
        average_per_transaction: 0
      } unless result

      total = result.total_amount.to_f
      count = result.transaction_count

      {
        label: threshold[:label],
        max_amount: threshold[:max],
        total_amount: total,
        transaction_count: count,
        average_per_transaction: count > 0 ? (total / count).round(2) : 0
      }
    end
  end

  # Largest single expense - OPTIMIZED: Single query
  def largest_single_expense
    largest = transactions.debits
      .includes(:category)
      .order(amount: :desc)
      .limit(1)
      .first

    return nil unless largest

    {
      amount: largest.amount.to_f,
      description: largest.description,
      date: largest.transaction_date,
      category: largest.category&.name
    }
  end

  # Weekend vs weekday spend - OPTIMIZED: SQL with CASE
  def weekend_vs_weekday_spend
    debits = transactions.debits

    # Single query with conditional aggregation based on day of week
    # Remove any default ordering before aggregation
    result = debits
      .reorder(nil) # Remove any default ORDER BY
      .select(
        "SUM(CASE WHEN EXTRACT(DOW FROM transaction_date) IN (0, 6) THEN amount ELSE 0 END) as weekend_total",
        "COUNT(CASE WHEN EXTRACT(DOW FROM transaction_date) IN (0, 6) THEN 1 END) as weekend_count",
        "SUM(CASE WHEN EXTRACT(DOW FROM transaction_date) NOT IN (0, 6) THEN amount ELSE 0 END) as weekday_total",
        "COUNT(CASE WHEN EXTRACT(DOW FROM transaction_date) NOT IN (0, 6) THEN 1 END) as weekday_count"
      )
      .take

    return {
      weekend: { total: 0, count: 0, average: 0 },
      weekday: { total: 0, count: 0, average: 0 }
    } unless result

    weekend_total = result.weekend_total.to_f
    weekend_count = result.weekend_count
    weekday_total = result.weekday_total.to_f
    weekday_count = result.weekday_count

    {
      weekend: {
        total: weekend_total,
        count: weekend_count,
        average: weekend_count > 0 ? (weekend_total / weekend_count).round(2) : 0
      },
      weekday: {
        total: weekday_total,
        count: weekday_count,
        average: weekday_count > 0 ? (weekday_total / weekday_count).round(2) : 0
      }
    }
  end

  # Helper methods

  def extract_merchant_name(description)
    # Remove common prefixes and suffixes
    cleaned = description
      .gsub(/^(UPI|IMPS|NEFT|RTGS|UPI\/)/i, '')
      .gsub(/\s+/, ' ')
      .strip

    # Take first 2-3 words (likely merchant name)
    words = cleaned.split(' ')
    return nil if words.empty?

    # Common patterns to skip
    skip_words = %w[to from payment transfer ref]
    words = words.reject { |w| skip_words.include?(w.downcase) }

    words.first(3).join(' ').titleize
  end

  def normalize_description_for_recurring(description)
    # Normalize for recurring detection
    cleaned = description
      .downcase
      .gsub(/\d+/, '') # Remove numbers
      .gsub(/[^\w\s]/, '') # Remove special chars
      .gsub(/\s+/, ' ')
      .strip

    # Take first few meaningful words
    words = cleaned.split(' ').reject { |w| w.length < 3 }
    words.first(3).join(' ')
  end

  def similar_amounts?(amounts)
    return false if amounts.empty?

    avg = amounts.sum / amounts.size
    # Consider similar if within 20% of average
    amounts.all? { |amt| (amt - avg).abs / avg < 0.2 }
  end
end
