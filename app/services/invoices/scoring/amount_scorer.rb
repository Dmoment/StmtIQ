# frozen_string_literal: true

module Invoices
  module Scoring
    # SOLID: Single Responsibility - Scores amount matching only
    class AmountScorer < BaseScorer
      WEIGHTS = {
        exact: 50,
        within_1_percent: 35,
        within_5_percent: 25,
        within_10_percent: 15,  # Handle discounts
        within_20_percent: 10   # Handle larger discounts
      }.freeze

      def score
        diff = (@transaction.amount - @invoice.total_amount).abs
        percent_diff = diff / @invoice.total_amount

        if diff < 0.01
          WEIGHTS[:exact]
        elsif percent_diff <= 0.01
          WEIGHTS[:within_1_percent]
        elsif percent_diff <= 0.05
          WEIGHTS[:within_5_percent]
        elsif percent_diff <= 0.10
          WEIGHTS[:within_10_percent]
        elsif percent_diff <= 0.20
          WEIGHTS[:within_20_percent]
        else
          0
        end
      end

      def breakdown
        diff = (@transaction.amount - @invoice.total_amount).abs
        percent_diff = (diff / @invoice.total_amount * 100).round(2)

        points = score
        { match: diff < 0.01 ? 'exact' : "#{percent_diff}% diff", points: points }
      end

      def weight
        WEIGHTS[:exact]
      end
    end
  end
end
