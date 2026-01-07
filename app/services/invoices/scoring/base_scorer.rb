# frozen_string_literal: true

module Invoices
  module Scoring
    # SOLID: Open/Closed - Base class for scoring strategies
    class BaseScorer
      def initialize(invoice, transaction)
        @invoice = invoice
        @transaction = transaction
      end

      def score
        raise NotImplementedError, "#{self.class} must implement #score"
      end

      def breakdown
        raise NotImplementedError, "#{self.class} must implement #breakdown"
      end

      def weight
        raise NotImplementedError, "#{self.class} must implement #weight"
      end
    end
  end
end
