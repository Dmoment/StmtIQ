# frozen_string_literal: true

module BankParsers
  module Icici
    # Parser for ICICI Current Account statements
    #
    # Current Account Format:
    # - Single amount column with Cr/Dr indicator
    # - Columns: Transaction ID | Value Date | Description | Cr/Dr | Transaction Amount(INR) | Available Balance(INR)
    #
    # SOLID: Single Responsibility - Only handles Current Account parsing logic
    #
    class CurrentParser < BaseIciciParser
      protected

      def extract_transaction(row)
        date = extract_date(row)
        description = extract_description(row)
        reference = extract_reference(row)
        cr_dr = get_mapped_value(row, :cr_dr)

        amount, transaction_type = extract_amount_with_type(row, cr_dr)
        balance = extract_balance(row)

        build_transaction_data(
          date: date,
          description: description,
          amount: amount,
          transaction_type: transaction_type,
          balance: balance,
          reference: reference
        )
      end

      private

      def extract_date(row)
        date_value = get_mapped_value(row, :date)
        parse_icici_date(date_value)
      end

      def extract_description(row)
        description = get_mapped_value(row, :narration) ||
                      get_mapped_value(row, :description) || ''
        clean_description(description)
      end

      def extract_reference(row)
        ref = get_mapped_value(row, :reference)
        ref&.to_s&.strip
      end

      def extract_balance(row)
        balance_value = get_mapped_value(row, :balance)
        parse_amount(balance_value)
      end

      # Current account uses single amount column with Cr/Dr indicator
      def extract_amount_with_type(row, cr_dr)
        amount_value = get_mapped_value(row, :amount)
        amount = parse_amount(amount_value)

        # Determine transaction type from Cr/Dr column
        transaction_type = determine_type_from_cr_dr(cr_dr) || 'debit'

        [amount, transaction_type]
      end
    end
  end
end
