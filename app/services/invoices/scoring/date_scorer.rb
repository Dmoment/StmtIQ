# frozen_string_literal: true

module Invoices
  module Scoring
    # SOLID: Single Responsibility - Scores date matching only
    class DateScorer < BaseScorer
      WEIGHTS = {
        same_day: 25,
        within_1_day: 20,
        within_3_days: 15,
        within_7_days: 5
      }.freeze

      def score
        return 0 unless @invoice.invoice_date

        days_diff = (@transaction.transaction_date - @invoice.invoice_date).abs.to_i

        case days_diff
        when 0 then WEIGHTS[:same_day]
        when 1 then WEIGHTS[:within_1_day]
        when 2..3 then WEIGHTS[:within_3_days]
        when 4..7 then WEIGHTS[:within_7_days]
        else 0
        end
      end

      def breakdown
        return {} unless @invoice.invoice_date

        days_diff = (@transaction.transaction_date - @invoice.invoice_date).abs.to_i
        { days_apart: days_diff, points: score }
      end

      def weight
        WEIGHTS[:same_day]
      end
    end
  end
end
