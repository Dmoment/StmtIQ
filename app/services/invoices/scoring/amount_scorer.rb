# frozen_string_literal: true

module Invoices
  module Scoring
    # SOLID: Single Responsibility - Scores amount matching only
    class AmountScorer < BaseScorer
      WEIGHTS = {
        exact: 50,
        within_1_percent: 35,
        within_5_percent: 20
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
        else
          0
        end
      end

      def breakdown
        diff = (@transaction.amount - @invoice.total_amount).abs
        percent_diff = (diff / @invoice.total_amount * 100).round(2)

        if diff < 0.01
          { match: 'exact', points: WEIGHTS[:exact] }
        elsif percent_diff <= 1
          { match: "#{percent_diff}% diff", points: WEIGHTS[:within_1_percent] }
        elsif percent_diff <= 5
          { match: "#{percent_diff}% diff", points: WEIGHTS[:within_5_percent] }
        else
          { match: "#{percent_diff}% diff", points: 0 }
        end
      end

      def weight
        WEIGHTS[:exact]
      end
    end
  end
end
