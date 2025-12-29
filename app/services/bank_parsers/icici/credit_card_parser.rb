# frozen_string_literal: true

module BankParsers
  module Icici
    # Parser for ICICI Credit Card statements (CSV format)
    #
    # Credit Card CSV Format:
    # - Header rows: Accountno, Customer Name, Address
    # - Transaction section starts after "Transaction Details:" row
    # - Columns: Date | Sr.No. | Transaction Details | Reward Point Header | Intl.Amount | Amount(in Rs) | BillingAmountSign
    #
    # Transaction Type Detection:
    # - BillingAmountSign = "CR" → Credit (payment received, refund)
    # - BillingAmountSign = empty/blank → Debit (purchase, charge)
    #
    # SOLID: Single Responsibility - Only handles Credit Card CSV parsing logic
    #
    class CreditCardParser < BaseIciciParser
      protected

      def extract_transaction(row)
        date = extract_date(row)
        description = extract_description(row)
        reference = extract_reference(row)
        international_amount = extract_international_amount(row)

        amount, transaction_type = extract_credit_card_amount(row)

        build_transaction_data(
          date: date,
          description: description,
          amount: amount,
          transaction_type: transaction_type,
          balance: nil, # Credit cards don't show running balance
          reference: reference
        ).merge(
          metadata: build_metadata.merge(
            international_amount: international_amount,
            reward_points: extract_reward_points(row)
          )
        )
      end

      private

      def extract_date(row)
        date_value = get_mapped_value(row, :date) ||
                     row['Date'] ||
                     row['Transaction Date']
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
              row['Sr.No.'] ||
              row['Sr.No'] ||
              row['Reference Number']
        ref&.to_s&.strip
      end

      def extract_international_amount(row)
        intl_amount = row['Intl.Amount'] || row['Intl Amount'] || row['International Amount']
        parse_amount(intl_amount)
      end

      def extract_reward_points(row)
        points = row['Reward Point Header'] || row['Reward Points'] || row['Points']
        points.to_i if points.present?
      end

      # Credit card amount handling using BillingAmountSign column
      # - BillingAmountSign = "CR" → Credit (payment/refund)
      # - BillingAmountSign = blank → Debit (purchase/charge)
      def extract_credit_card_amount(row)
        amount_value = get_mapped_value(row, :amount) ||
                       row['Amount(in Rs)'] ||
                       row['Amount (in Rs)'] ||
                       row['Amount']
        return [0, 'debit'] if amount_value.blank?

        amount = parse_amount(amount_value)
        is_credit = credit_transaction?(row)

        [amount, is_credit ? 'credit' : 'debit']
      end

      def credit_transaction?(row)
        # Check BillingAmountSign column (primary indicator)
        billing_sign = row['BillingAmountSign'] || row['Billing Amount Sign'] || row['Sign']
        return billing_sign.to_s.strip.upcase == 'CR' if billing_sign.present?

        # Fallback: Check Cr/Dr column
        cr_dr = get_mapped_value(row, :cr_dr)
        return determine_type_from_cr_dr(cr_dr) == 'credit' if cr_dr.present?

        # Fallback: Check description for payment indicators
        description = extract_description(row).downcase
        payment_indicators = [
          'payment received',
          'payment - thank you',
          'refund',
          'cashback',
          'reversal',
          'credit adjustment'
        ]
        payment_indicators.any? { |ind| description.include?(ind) }
      end

      # Override header indicators for credit card CSV format
      def header_indicators
        config_value(:header_indicators) || [
          'Sr.No.',
          'Sr.No',
          'Transaction Details',
          'Amount(in Rs)',
          'BillingAmountSign',
          'Intl.Amount'
        ]
      end

      # Override skip patterns for credit card specific rows
      def skip_patterns
        super + [
          'transaction details:',
          'minimum amount due',
          'total amount due',
          'credit limit',
          'available credit',
          'statement date',
          'due date',
          'accountno',
          'customer name',
          'address'
        ]
      end

      # Override column fallbacks for credit card specific columns
      def column_fallbacks(key)
        case key.to_sym
        when :date
          ['Date', 'Transaction Date', 'Txn Date', 'Posting Date']
        when :narration, :description
          ['Transaction Details', 'Description', 'Particulars', 'Details']
        when :reference
          ['Sr.No.', 'Sr.No', 'Reference Number', 'Reference No', 'Ref No']
        when :amount
          ['Amount(in Rs)', 'Amount (in Rs)', 'Amount', 'Billing Amount', 'Transaction Amount']
        when :cr_dr
          ['BillingAmountSign', 'Billing Amount Sign', 'Sign', 'Cr/Dr', 'Type']
        else
          super
        end
      end
    end
  end
end
