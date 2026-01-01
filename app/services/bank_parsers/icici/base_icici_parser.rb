# frozen_string_literal: true

require 'creek'

module BankParsers
  module Icici
    # Base class for all ICICI bank parsers
    # Contains shared logic for parsing ICICI statements
    #
    # STREAMING NOTES:
    # - CSV: TRUE streaming via CSV.foreach (handles multiline fields correctly)
    # - XLSX: TRUE streaming via Creek gem (parses XML inside XLSX incrementally)
    # - XLS: Roo with size limit (old binary format has limited streaming options)
    #
    # SOLID Principles:
    # - Single Responsibility: Handles common ICICI parsing logic only
    # - Open/Closed: Open for extension (subclasses), closed for modification
    # - Liskov Substitution: Any ICICI parser can substitute this base
    # - Dependency Inversion: Depends on abstract BaseParser
    #
    class BaseIciciParser < BankParsers::BaseParser
      BANK_CODE = 'icici'.freeze
      XLS_MAX_SIZE = 20.megabytes # XLS files larger than this should be converted to CSV

      # ============================================
      # Streaming API (ONLY way to parse)
      # ============================================

      # Yields transactions one-by-one. NEVER holds full array in memory.
      # Memory usage stays CONSTANT regardless of file size.
      def each_transaction(&block)
        return enum_for(:each_transaction) unless block_given?

        # Reset cached header map for each parse
        @resolved_header_map = nil
        @cached_skip_patterns = nil

        case file_extension
        when '.csv' then stream_csv(&block)
        when '.xls' then stream_xls(&block)
        when '.xlsx' then stream_xlsx_with_creek(&block)
        else
          @errors << "Unsupported file format: #{file_extension}"
        end
      end

      protected

      # ============================================
      # Streaming File Type Handlers
      # ============================================

      # ✅ TRUE STREAMING: Uses CSV.foreach which handles:
      # - Multiline fields (quotes with newlines inside)
      # - Memory-efficient line-by-line processing
      # - Proper CSV escaping
      def stream_csv(&block)
        require 'csv'

        headers_found = false
        headers = nil

        # Use CSV.foreach for proper multiline CSV handling
        # This is truly streaming - one row at a time
        CSV.foreach(
          file_path,
          encoding: config_value(:encoding) || 'UTF-8',
          liberal_parsing: true,
          skip_blanks: true
        ).with_index do |row, idx|
          next if row.nil? || row.all?(&:nil?)

          # Find header row
          row_text = row.compact.map(&:to_s).join(' ')
          if !headers_found && header_row?(row_text)
            headers = row.map { |h| h&.to_s&.strip }
            build_resolved_header_map!(headers)
            headers_found = true
            next
          end

          next unless headers_found

          begin
            row_hash = row_to_hash(row, headers)
            next if skip_row_fast?(row_hash)

            data = extract_transaction(row_hash)
            yield data if valid_transaction_row?(data)
          rescue => e
            log_parse_error("CSV row", idx, e)
            next
          end
        end
      rescue => e
        handle_parse_error("CSV", e)
      end

      # ⚠️ XLS (old binary format): Limited streaming options
      # Roo buffers internally. For large files, recommend converting to CSV.
      def stream_xls(&block)
        file_size = File.size(file_path)

        if file_size > XLS_MAX_SIZE
          @errors << "XLS file too large (#{(file_size / 1.megabyte).round(1)}MB). Please export to CSV for better performance."
          Rails.logger.error("XLS file exceeds #{XLS_MAX_SIZE / 1.megabyte}MB limit. Convert to CSV.")
          return
        end

        Rails.logger.info("Parsing XLS file (#{(file_size / 1.megabyte).round(2)}MB) with Roo")

        doc = Roo::Excel.new(file_path)
        stream_spreadsheet_roo(doc, &block)
      rescue => e
        handle_parse_error("XLS", e)
      end

      # ✅ TRUE STREAMING: Uses Creek gem which:
      # - Parses the XML inside XLSX incrementally
      # - Never loads entire workbook into memory
      # - Memory stays constant regardless of file size
      def stream_xlsx_with_creek(&block)
        Rails.logger.info("Parsing XLSX with Creek (true streaming)")

        creek = Creek::Book.new(file_path, check_file_extension: false)
        sheet = creek.sheets.first

        headers = nil
        headers_found = false
        row_count = 0

        sheet.simple_rows.each do |row|
          row_count += 1
          values = row.values

          next if values.nil? || values.all?(&:nil?)

          # Find header row
          row_text = values.compact.map(&:to_s).join(' ')
          if !headers_found && header_row?(row_text)
            headers = values.map { |h| h&.to_s&.strip }
            build_resolved_header_map!(headers)
            headers_found = true
            Rails.logger.info("#{self.class.name}: Found headers at row #{row_count}: #{headers.inspect}")
            next
          end

          next unless headers_found

          begin
            row_hash = row_to_hash(values, headers)
            next if skip_row_fast?(row_hash)

            data = extract_transaction(row_hash)
            yield data if valid_transaction_row?(data)
          rescue => e
            log_parse_error("XLSX row", row_count, e)
            next
          end
        end
      rescue => e
        handle_parse_error("XLSX", e)
      end

      # Fallback: Roo-based spreadsheet parsing (for XLS)
      def stream_spreadsheet_roo(doc, &block)
        sheet = doc.sheet(0)

        header_row_idx = find_icici_header_row(sheet)
        headers = normalize_headers(sheet.row(header_row_idx))

        # Build resolved header map ONCE (O(1) lookups thereafter)
        build_resolved_header_map!(headers)

        Rails.logger.info("#{self.class.name}: Found headers at row #{header_row_idx}: #{headers.inspect}")

        # Stream row-by-row, yield immediately
        ((header_row_idx + 1)..sheet.last_row).each do |row_idx|
          row = sheet.row(row_idx)
          next if row.nil? || row.all?(&:nil?)

          row_hash = row_to_hash(row, headers)
          next if skip_row_fast?(row_hash)

          data = extract_transaction(row_hash)
          yield data if valid_transaction_row?(data)
        end
      end

      # ============================================
      # Abstract Methods (must be implemented by subclasses)
      # ============================================

      # Extract transaction data from a row - MUST be implemented by subclass
      def extract_transaction(row)
        raise NotImplementedError, "#{self.class} must implement #extract_transaction"
      end

      # ============================================
      # Header Resolution (O(1) lookups after first call)
      # ============================================

      # Build a one-time resolved header map for O(1) column lookups
      # Instead of O(columns) scan for every row, we resolve once
      def build_resolved_header_map!(headers)
        @resolved_header_map = {}

        # Normalize all headers once
        normalized_headers = headers.map { |h| normalize_column_name(h) }
        header_index = headers.each_with_index.to_h { |h, i| [normalize_column_name(h), i] }

        # Pre-resolve all column mappings
        [:date, :narration, :description, :reference, :amount, :withdrawal, :deposit, :balance, :cr_dr].each do |key|
          resolved_key = resolve_column_key(key, normalized_headers, header_index)
          @resolved_header_map[key] = resolved_key if resolved_key
        end

        Rails.logger.debug("Resolved header map: #{@resolved_header_map.inspect}")
      end

      def resolve_column_key(key, normalized_headers, header_index)
        # Try explicit mapping first
        if mapping_value(key)
          normalized = normalize_column_name(mapping_value(key))
          return mapping_value(key) if header_index[normalized]
        end

        # Try fallbacks
        column_fallbacks(key).each do |fallback|
          normalized = normalize_column_name(fallback)
          return fallback if header_index[normalized]
        end

        nil
      end

      def normalize_column_name(name)
        name&.to_s&.strip&.downcase&.gsub(/\s+/, ' ')
      end

      # Fast O(1) column lookup using pre-resolved map
      def get_mapped_value_fast(row, key)
        column_name = @resolved_header_map[key]
        return nil unless column_name

        # Direct hash lookup (O(1))
        row[column_name]
      end

      # ============================================
      # Skip Row Detection (Optimized)
      # ============================================

      # Pre-compute downcased skip patterns (cached)
      def cached_skip_patterns
        @cached_skip_patterns ||= skip_patterns.map(&:downcase).freeze
      end

      # Fast skip detection - minimal string operations
      def skip_row_fast?(row)
        return true if row.values.all?(&:blank?)

        # Only check first column and narration (most common skip indicators)
        first_val = row.values.first&.to_s&.downcase || ''
        narration = get_mapped_value_fast(row, :narration)&.to_s&.downcase || ''

        # Short-circuit: check patterns against minimal text
        cached_skip_patterns.any? do |pattern|
          first_val.include?(pattern) || narration.include?(pattern)
        end
      end

      # ============================================
      # Shared ICICI-specific Logic
      # ============================================

      def find_icici_header_row(sheet)
        indicators = header_indicators.map(&:downcase)

        (1..30).each do |row_idx|
          row = sheet.row(row_idx)
          next unless row

          row_text = row.compact.map(&:to_s).join(' ').downcase

          # Check if row contains at least 2 header indicators (more reliable)
          matches = indicators.count { |ind| row_text.include?(ind) }

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
        @header_indicators ||= (config_value(:header_indicators) || [
          'Transaction ID',
          'Value Date',
          'S No.',
          'Transaction Remarks',
          'Withdrawal Amount'
        ]).freeze
      end

      def skip_patterns
        @skip_patterns ||= (config_value(:skip_patterns) || [
          'opening balance',
          'closing balance',
          'statement summary',
          'total',
          'transactions list',
          'account number',
          'statement period',
          'search',
          'advanced search'
        ]).freeze
      end

      def date_formats
        @date_formats ||= (config_value(:date_formats) || ['%d-%m-%Y', '%d/%m/%Y']).freeze
      end

      def credit_indicators
        @credit_indicators ||= (config_value(:credit_indicators) || ['cr', 'credit', 'c']).freeze
      end

      def debit_indicators
        @debit_indicators ||= (config_value(:debit_indicators) || ['dr', 'debit', 'd']).freeze
      end

      # ============================================
      # Helper Methods
      # ============================================

      def header_row?(line_or_text)
        text = line_or_text.to_s.downcase
        header_indicators.any? { |ind| text.include?(ind.downcase) }
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

      # Legacy method - use get_mapped_value_fast for hot paths
      def get_mapped_value(row, key)
        # Use fast path if available
        return get_mapped_value_fast(row, key) if @resolved_header_map

        # Fallback to slow path (only during header detection)
        column_name = mapping_value(key)
        if column_name
          return row[column_name] if row[column_name].present?
          matched = row.keys.find { |k| normalize_column_name(k) == normalize_column_name(column_name) }
          return row[matched] if matched && row[matched].present?
        end

        column_fallbacks(key).each do |col|
          return row[col] if row[col].present?
          matched = row.keys.find { |k| normalize_column_name(k) == normalize_column_name(col) }
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
          ['Withdrawal Amount(INR)', 'Withdrawal Amount (INR)', 'Withdrawal', 'Withdrawal Amount', 'Debit', 'Dr', 'Debit Amount', 'Debit(INR)']
        when :deposit
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

      # ⚠️ REMOVED: file_lines method that loaded entire file into RAM
      # DO NOT add File.readlines anywhere - it breaks streaming

      def normalize_headers(row)
        row.map { |h| h&.to_s&.strip&.gsub(/\s+/, ' ') }
      end

      def log_parse_error(context, line_idx, error)
        Rails.logger.warn("ICICI #{context} parse error at line #{line_idx}: #{error.message}")
      end

      def handle_parse_error(format, error)
        @errors << "ICICI #{format} parsing error: #{error.message}"
        Rails.logger.error("ICICI #{format} parsing error: #{error.message}\n#{error.backtrace.first(5).join("\n")}")
      end
    end
  end
end
