# frozen_string_literal: true

module BankParsers
  module Icici
    # Base class for all ICICI bank parsers
    # Contains shared logic for parsing ICICI statements
    #
    # SOLID Principles:
    # - Single Responsibility: Handles common ICICI parsing logic only
    # - Open/Closed: Open for extension (subclasses), closed for modification
    # - Liskov Substitution: Any ICICI parser can substitute this base
    # - Dependency Inversion: Depends on abstract BaseParser
    #
    class BaseIciciParser < BankParsers::BaseParser
      BANK_CODE = 'icici'.freeze

      def parse
        case file_extension
        when '.csv' then parse_csv
        when '.xls' then parse_xls
        when '.xlsx' then parse_xlsx
        else
          @errors << "Unsupported file format: #{file_extension}"
          []
        end
      end

      protected

      # ============================================
      # File Type Handlers
      # ============================================

      def parse_csv
        require 'csv'

        transactions = []
        headers = nil
        data_started = false

        file_lines.each_with_index do |line, idx|
          next if line.strip.empty?

          # Find header row
          if !data_started && header_row?(line)
            headers = CSV.parse_line(line)
            data_started = true
            next
          end

          next unless data_started && headers

          begin
            row = CSV.parse_line(line)
            next if row.nil? || row.all?(&:nil?)

            row_hash = row_to_hash(row, headers)
            next if skip_row?(row_hash)

            data = extract_transaction(row_hash)
            transactions << data if valid_transaction_row?(data)
          rescue => e
            log_parse_error("CSV row", idx, e)
            next
          end
        end

        transactions
      rescue => e
        handle_parse_error("CSV", e)
      end

      def parse_xls
        doc = Roo::Excel.new(file_path)
        parse_spreadsheet(doc)
      rescue => e
        handle_parse_error("XLS", e)
      end

      def parse_xlsx
        doc = Roo::Excelx.new(file_path)
        parse_spreadsheet(doc)
      rescue => e
        handle_parse_error("XLSX", e)
      end

      def parse_spreadsheet(doc)
        sheet = doc.sheet(0)
        transactions = []

        header_row_idx = find_icici_header_row(sheet)
        headers = normalize_headers(sheet.row(header_row_idx))

        Rails.logger.info("#{self.class.name}: Found headers at row #{header_row_idx}: #{headers.inspect}")

        ((header_row_idx + 1)..sheet.last_row).each do |row_idx|
          row = sheet.row(row_idx)
          next if row.all?(&:nil?)

          row_hash = row_to_hash(row, headers)
          next if skip_row?(row_hash)

          data = extract_transaction(row_hash)
          transactions << data if valid_transaction_row?(data)
        end

        transactions
      end

      # ============================================
      # Abstract Methods (must be implemented by subclasses)
      # ============================================

      # Extract transaction data from a row - MUST be implemented by subclass
      def extract_transaction(row)
        raise NotImplementedError, "#{self.class} must implement #extract_transaction"
      end

      # ============================================
      # Shared ICICI-specific Logic
      # ============================================

      def find_icici_header_row(sheet)
        indicators = header_indicators

        (1..30).each do |row_idx|
          row = sheet.row(row_idx)
          next unless row

          row_text = row.compact.map(&:to_s).join(' ').downcase

          # Check if row contains at least 2 header indicators (more reliable)
          matches = indicators.count { |ind| row_text.include?(ind.downcase) }

          # Also check for common header patterns
          has_date_header = row_text.include?('date') || row_text.include?('value date')
          has_amount_header = row_text.include?('amount') || row_text.include?('withdrawal') || row_text.include?('deposit')

          if matches >= 2 || (has_date_header && has_amount_header)
            Rails.logger.info("#{self.class.name}: Found header row at index #{row_idx}")
            return row_idx
          end
        end

        1 # Default to second row (row 0 is often title/logo)
      end

      def header_indicators
        config_value(:header_indicators) || [
          'Transaction ID',
          'Value Date',
          'S No.',
          'Transaction Remarks',
          'Withdrawal Amount'
        ]
      end

      def skip_patterns
        config_value(:skip_patterns) || [
          'opening balance',
          'closing balance',
          'statement summary',
          'total',
          'transactions list',
          'account number',
          'statement period',
          'search',
          'advanced search'
        ]
      end

      def date_formats
        config_value(:date_formats) || ['%d-%m-%Y', '%d/%m/%Y']
      end

      def credit_indicators
        config_value(:credit_indicators) || ['cr', 'credit', 'c']
      end

      def debit_indicators
        config_value(:debit_indicators) || ['dr', 'debit', 'd']
      end

      # ============================================
      # Helper Methods
      # ============================================

      def skip_row?(row)
        # Check if row should be skipped (summary rows, etc.)
        return true if row.values.all?(&:blank?)

        text_to_check = [
          row.values.first,
          get_mapped_value(row, :narration),
          get_mapped_value(row, :description)
        ].compact.map(&:to_s).join(' ').downcase

        skip_patterns.any? { |pattern| text_to_check.include?(pattern.downcase) }
      end

      def header_row?(line)
        header_indicators.any? { |ind| line.downcase.include?(ind.downcase) }
      end

      def parse_icici_date(value)
        return nil if value.blank?

        case value
        when Date, DateTime, Time
          value.to_date
        when Numeric
          # Excel date serial number
          Date.new(1899, 12, 30) + value.to_i.days
        when String
          parse_date_with_formats(value.strip)
        else
          nil
        end
      rescue => e
        Rails.logger.warn("ICICI date parse error for '#{value}': #{e.message}")
        nil
      end

      def parse_date_with_formats(value)
        date_formats.each do |fmt|
          begin
            return Date.strptime(value, fmt)
          rescue ArgumentError
            next
          end
        end

        # Fallback: try Ruby's Date.parse
        Date.parse(value)
      rescue
        nil
      end

      def determine_type_from_cr_dr(cr_dr_value)
        return nil if cr_dr_value.blank?

        normalized = cr_dr_value.to_s.strip.downcase

        if credit_indicators.any? { |ind| normalized.start_with?(ind) }
          'credit'
        elsif debit_indicators.any? { |ind| normalized.start_with?(ind) }
          'debit'
        else
          nil
        end
      end

      def get_mapped_value(row, key)
        # Try to get value using column mapping, with fallbacks
        column_name = mapping_value(key)
        if column_name
          # Try exact match first
          return row[column_name] if row[column_name].present?
          # Try case-insensitive match
          matched = row.keys.find { |k| k&.downcase&.gsub(/\s+/, ' ') == column_name.downcase.gsub(/\s+/, ' ') }
          return row[matched] if matched && row[matched].present?
        end

        # Try common variations (case-insensitive)
        fallbacks = column_fallbacks(key)
        fallbacks.each do |col|
          # Exact match
          return row[col] if row[col].present?
          # Case-insensitive match with normalized whitespace
          matched = row.keys.find { |k| k&.downcase&.gsub(/\s+/, ' ') == col.downcase.gsub(/\s+/, ' ') }
          return row[matched] if matched && row[matched].present?
        end

        nil
      end

      def column_fallbacks(key)
        case key.to_sym
        when :date
          ['Value Date', 'Transaction Date', 'Date', 'Txn Date', 'Posting Date', 'Tran Date']
        when :narration, :description
          ['Transaction Remarks', 'Description', 'Narration', 'Particulars', 'Details', 'Remarks', 'Transaction Details']
        when :reference
          ['Cheque Number', 'Chq No', 'Transaction ID', 'Reference', 'Ref No', 'Reference Number', 'Txn ID', 'Chq./Ref.No.']
        when :amount
          ['Transaction Amount(INR)', 'Transaction Amount (INR)', 'Transaction Amount', 'Amount', 'Amount (INR)', 'Amount(INR)']
        when :withdrawal
          # Try exact matches first (with and without spaces)
          ['Withdrawal Amount(INR)', 'Withdrawal Amount (INR)', 'Withdrawal', 'Withdrawal Amount', 'Debit', 'Dr', 'Debit Amount', 'Debit(INR)']
        when :deposit
          # Try exact matches first (with and without spaces)
          ['Deposit Amount(INR)', 'Deposit Amount (INR)', 'Deposit', 'Deposit Amount', 'Credit', 'Cr', 'Credit Amount', 'Credit(INR)']
        when :balance
          ['Balance(INR)', 'Balance (INR)', 'Available Balance(INR)', 'Balance', 'Closing Balance', 'Running Balance', 'Available Balance']
        when :cr_dr
          ['Cr/Dr', 'CR/DR', 'Type', 'Dr/Cr', 'Transaction Type']
        else
          []
        end
      end

      def mapping_value(key)
        column_mappings[key.to_s] || column_mappings[key.to_sym]
      end

      def config_value(key)
        parser_config[key.to_s] || parser_config[key.to_sym]
      end

      def build_transaction_data(date:, description:, amount:, transaction_type:, balance: nil, reference: nil)
        {
          transaction_date: date,
          original_description: description,
          description: description.to_s.truncate(250),
          amount: amount,
          transaction_type: transaction_type,
          balance: balance,
          reference: reference,
          metadata: build_metadata
        }
      end

      def build_metadata
        {
          bank: BANK_CODE,
          account_type: template.account_type,
          source: 'statement_import',
          template_id: template.id
        }
      end

      # ============================================
      # Utility Methods
      # ============================================

      def file_extension
        File.extname(file_path).downcase
      end

      def file_lines
        File.readlines(file_path, encoding: config_value(:encoding) || 'UTF-8')
      end

      def normalize_headers(row)
        row.map { |h| h&.to_s&.strip&.gsub(/\s+/, ' ') }
      end

      def log_parse_error(context, line_idx, error)
        Rails.logger.warn("ICICI #{context} parse error at line #{line_idx}: #{error.message}")
      end

      def handle_parse_error(format, error)
        @errors << "ICICI #{format} parsing error: #{error.message}"
        Rails.logger.error("ICICI #{format} parsing error: #{error.message}\n#{error.backtrace.first(5).join("\n")}")
        []
      end
    end
  end
end
