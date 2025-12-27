# frozen_string_literal: true

module BankParsers
  module Icici
    # Parser for ICICI Credit Card statements
    #
    # Credit Card Format:
    # - Single amount column
    # - Credits (payments/refunds) indicated by "CR" suffix or separate indicator
    # - Columns: Transaction Date | Posting Date | Transaction Details | Amount | Reference Number
    #
    # SOLID: Single Responsibility - Only handles Credit Card parsing logic
    #
    class CreditCardParser < BaseIciciParser
      protected

      def extract_transaction(row)
        date = extract_date(row)
        description = extract_description(row)
        reference = extract_reference(row)

        amount, transaction_type = extract_credit_card_amount(row)

        build_transaction_data(
          date: date,
          description: description,
          amount: amount,
          transaction_type: transaction_type,
          balance: nil, # Credit cards don't typically show running balance
          reference: reference
        )
      end

      private

      def extract_date(row)
        # Prefer transaction date over posting date
        date_value = get_mapped_value(row, :date) ||
                     row['Transaction Date'] ||
                     row['Posting Date']
        parse_icici_date(date_value)
      end

      def extract_description(row)
        description = get_mapped_value(row, :narration) ||
                      row['Transaction Details'] ||
                      row['Description'] || ''
        clean_description(description)
      end

      def extract_reference(row)
        ref = get_mapped_value(row, :reference) ||
              row['Reference Number'] ||
              row['Reference No']
        ref&.to_s&.strip
      end

      # Credit card amount handling
      # - Positive amounts = charges (debit from user's perspective)
      # - Negative amounts or "CR" suffix = credits (payments/refunds)
      def extract_credit_card_amount(row)
        amount_value = get_mapped_value(row, :amount) || row['Amount']
        return [0, 'debit'] if amount_value.blank?

        amount_str = amount_value.to_s.strip

        # Check for credit indicator (CR suffix or negative)
        is_credit = credit_transaction?(amount_str, row)

        # Parse the numeric amount
        amount = parse_amount(amount_str)

        if is_credit
          # Credits are payments or refunds
          ['credit', amount]
        else
          # Regular charges
          ['debit', amount]
        end.reverse # Returns [amount, transaction_type]
      end

      def credit_transaction?(amount_str, row)
        credit_suffix = config_value(:credit_suffix) || 'CR'

        # Check various indicators for credit transactions
        return true if amount_str.upcase.include?(credit_suffix)
        return true if amount_str.start_with?('-')
        return true if amount_str.include?('(') && amount_str.include?(')')

        # Check for Cr/Dr column if present
        cr_dr = get_mapped_value(row, :cr_dr)
        return determine_type_from_cr_dr(cr_dr) == 'credit' if cr_dr.present?

        # Check description for payment indicators
        description = (get_mapped_value(row, :narration) || '').downcase
        payment_indicators = ['payment received', 'payment - thank you', 'refund', 'cashback', 'reversal']
        payment_indicators.any? { |ind| description.include?(ind) }
      end

      # Override skip patterns for credit card specific rows
      def skip_patterns
        super + [
          'payment received - thank you',
          'minimum amount due',
          'total amount due',
          'credit limit',
          'available credit',
          'statement date',
          'due date'
        ]
      end
    end
  end
end
