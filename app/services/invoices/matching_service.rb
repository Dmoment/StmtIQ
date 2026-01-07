# frozen_string_literal: true

module Invoices
  class MatchingService
    # Thresholds for auto-matching and suggestions
    AUTO_MATCH_THRESHOLD = 80
    SUGGEST_THRESHOLD = 40
    MAX_SUGGESTIONS = 5

    attr_reader :invoice, :user

    # SOLID: Dependency Inversion - Inject scorers
    def initialize(invoice, scorers: nil)
      @invoice = invoice
      @user = invoice.user
      @scorers = scorers || default_scorers
    end

    # Main entry point: try to match and update invoice status
    def call
      return failure('Invoice not in extracted state') unless invoice.can_match?
      return failure('No amount found in invoice') unless invoice.total_amount

      candidates = find_candidates
      scored = score_candidates(candidates)

      best_match = scored.first

      if best_match && best_match[:score] >= AUTO_MATCH_THRESHOLD
        # Auto-match with high confidence
        invoice.mark_matched!(
          best_match[:transaction],
          confidence: best_match[:score] / 100.0,
          method: 'auto'
        )
        success(matched: true, transaction: best_match[:transaction], confidence: best_match[:score])
      elsif scored.any? { |s| s[:score] >= SUGGEST_THRESHOLD }
        # Keep as extracted, return suggestions
        suggestions = scored.select { |s| s[:score] >= SUGGEST_THRESHOLD }.first(MAX_SUGGESTIONS)
        success(matched: false, suggestions: suggestions)
      else
        # No good matches found
        invoice.mark_unmatched!
        success(matched: false, suggestions: [])
      end
    end

    # Get suggestions without changing invoice status
    def find_suggestions
      return [] unless invoice.total_amount

      candidates = find_candidates
      scored = score_candidates(candidates)
      scored.select { |s| s[:score] >= SUGGEST_THRESHOLD }.first(MAX_SUGGESTIONS)
    end

    private

    def find_candidates
      # Performance: Select only needed columns to reduce memory
      base_query = user.transactions
        .select(:id, :description, :amount, :transaction_date, :transaction_type,
                :normalized_merchant_name, :metadata, :category_id, :account_id)
        .where(invoice_id: nil)
        .where(transaction_type: 'debit')

      # Date range
      date_range = calculate_date_range
      base_query = base_query.where(transaction_date: date_range)

      # Amount range
      amount_range = calculate_amount_range
      base_query = base_query.where(amount: amount_range)

      # Performance: Preload associations to avoid N+1
      base_query.includes(:category, :account)
        .order(transaction_date: :desc)
        .limit(50)
    end

    def score_candidates(candidates)
      candidates.map do |txn|
        score = calculate_score(txn)
        breakdown = score_breakdown(txn)
        {
          transaction: txn,
          score: score,
          breakdown: breakdown,
          transaction_id: txn.id
        }
      end.sort_by { |s| -s[:score] }
    end

    # SOLID: Open/Closed - Use strategy pattern for scoring
    def calculate_score(txn)
      total_score = @scorers.sum { |scorer| scorer.new(invoice, txn).score }
      [total_score, 100].min
    end

    def score_breakdown(txn)
      @scorers.each_with_object({}) do |scorer_class, breakdown|
        scorer = scorer_class.new(invoice, txn)
        key = scorer_class.name.demodulize.underscore.gsub('_scorer', '').to_sym
        breakdown[key] = scorer.breakdown
      end
    end

    def default_scorers
      [
        Scoring::AmountScorer,
        Scoring::DateScorer,
        Scoring::VendorScorer
      ]
    end

    def calculate_date_range
      if invoice.invoice_date
        (invoice.invoice_date - 7.days)..(invoice.invoice_date + 7.days)
      else
        30.days.ago.to_date..Date.current
      end
    end

    def calculate_amount_range
      amount = invoice.total_amount
      tolerance = [amount * 0.05, 10].max
      (amount - tolerance)..(amount + tolerance)
    end

    def success(data)
      { success: true }.merge(data)
    end

    def failure(error)
      { success: false, error: error }
    end
  end
end
