# frozen_string_literal: true

module Invoices
  module Scoring
    # SOLID: Single Responsibility - Scores vendor matching only
    class VendorScorer < BaseScorer
      WEIGHTS = {
        exact: 25,
        partial: 15
      }.freeze

      def score
        return 0 unless @invoice.vendor_name

        # Performance: Memoize normalized values
        invoice_vendor = normalized_invoice_vendor
        txn_description = normalized_txn_description
        txn_merchant = normalized_txn_merchant

        # Exact match
        return WEIGHTS[:exact] if txn_description.include?(invoice_vendor) || txn_merchant.include?(invoice_vendor)

        # Partial match
        matching_words = invoice_words & txn_words
        matching_words.any? ? WEIGHTS[:partial] : 0
      end

      def breakdown
        return {} unless @invoice.vendor_name

        {
          invoice_vendor: @invoice.vendor_name,
          txn_description: @transaction.description,
          points: score
        }
      end

      def weight
        WEIGHTS[:exact]
      end

      private

      # Performance: Cache normalized values
      def normalized_invoice_vendor
        @normalized_invoice_vendor ||= normalize(@invoice.vendor_name)
      end

      def normalized_txn_description
        @normalized_txn_description ||= normalize(@transaction.description.to_s)
      end

      def normalized_txn_merchant
        # Use counterparty_name if available, otherwise fall back to original_description
        merchant_name = @transaction.counterparty_name.presence || @transaction.original_description.to_s
        @normalized_txn_merchant ||= normalize(merchant_name)
      end

      def invoice_words
        @invoice_words ||= normalized_invoice_vendor.split(/\s+/).select { |w| w.length > 2 }
      end

      def txn_words
        @txn_words ||= "#{normalized_txn_description} #{normalized_txn_merchant}".split(/\s+/).select { |w| w.length > 2 }
      end

      def normalize(text)
        text.to_s.downcase
          .gsub(/[\/\-_@.]/, ' ')  # Replace common separators with spaces first
          .gsub(/[^a-z0-9\s]/, '') # Then remove other special chars
          .gsub(/\s+/, ' ')
          .strip
      end
    end
  end
end
