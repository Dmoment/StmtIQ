# frozen_string_literal: true

module BankParsers
  module Icici
    # Parser for ICICI Savings Account statements
    #
    # Savings Account Format:
    # - Separate Withdrawal and Deposit columns
    # - Columns: Transaction ID | Value Date | Transaction Remarks | Withdrawal Amount (INR) | Deposit Amount (INR) | Balance (INR)
    #
    # SOLID: Single Responsibility - Only handles Savings Account parsing logic
    #
    class SavingsParser < BaseIciciParser
      protected

      def extract_transaction(row)
        date = extract_date(row)
        description = extract_description(row)
        reference = extract_reference(row)

        amount, transaction_type = extract_amount_from_separate_columns(row)
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

      # Savings account uses separate Withdrawal/Deposit columns
      def extract_amount_from_separate_columns(row)
        withdrawal = parse_amount(get_mapped_value(row, :withdrawal))
        deposit = parse_amount(get_mapped_value(row, :deposit))

        if deposit > 0
          [deposit, 'credit']
        elsif withdrawal > 0
          [withdrawal, 'debit']
        else
          # Check if there's a single amount column with Cr/Dr (fallback)
          amount = parse_amount(get_mapped_value(row, :amount))
          cr_dr = get_mapped_value(row, :cr_dr)

          if amount > 0 && cr_dr.present?
            transaction_type = determine_type_from_cr_dr(cr_dr) || 'debit'
            [amount, transaction_type]
          else
            [0, 'debit']
          end
        end
      end
    end
  end
end
