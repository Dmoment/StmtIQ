# frozen_string_literal: true

require 'creek'

module BankParsers
  module Concerns
    # XlsxStreaming - TRUE streaming XLSX parsing using Creek
    #
    # Creek parses the XML inside XLSX files incrementally, never loading
    # the entire workbook into memory. Memory stays constant regardless of file size.
    #
    # Usage:
    #   include BankParsers::Concerns::XlsxStreaming
    #
    #   def stream_xlsx(&block)
    #     stream_xlsx_with_creek(header_indicators: ['Date', 'Amount']) do |row_hash, headers|
    #       data = extract_transaction(row_hash)
    #       yield data if valid_transaction_row?(data)
    #     end
    #   end
    #
    module XlsxStreaming
      extend ActiveSupport::Concern

      XLS_MAX_SIZE = 20.megabytes

      # ✅ TRUE STREAMING: Uses Creek gem
      # - Parses XML inside XLSX incrementally
      # - Memory stays constant regardless of file size
      # - Handles large files (50k+ rows) efficiently
      def stream_xlsx_with_creek(header_indicators: nil, &block)
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
          if !headers_found && detect_header_row?(row_text, header_indicators)
            headers = values.map { |h| h&.to_s&.strip }
            on_headers_found(headers) if respond_to?(:on_headers_found, true)
            headers_found = true
            Rails.logger.info("#{self.class.name}: Found headers at row #{row_count}")
            next
          end

          next unless headers_found

          begin
            row_hash = row_to_hash(values, headers)
            yield row_hash, headers
          rescue => e
            Rails.logger.warn("#{self.class.name} XLSX row parse error at row #{row_count}: #{e.message}")
            next
          end
        end
      rescue => e
        @errors ||= []
        @errors << "XLSX parsing error: #{e.message}"
        Rails.logger.error("XLSX parsing error: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
      end

      # XLS (old binary format) - uses Roo with size limit
      def stream_xls_with_roo(header_indicators: nil, &block)
        file_size = File.size(file_path)

        if file_size > XLS_MAX_SIZE
          @errors ||= []
          @errors << "XLS file too large (#{(file_size / 1.megabyte).round(1)}MB). Please export to CSV."
          Rails.logger.error("XLS file exceeds size limit. Convert to CSV for better performance.")
          return
        end

        Rails.logger.info("Parsing XLS file (#{(file_size / 1.megabyte).round(2)}MB) with Roo")

        doc = Roo::Excel.new(file_path)
        sheet = doc.sheet(0)

        header_row_idx = find_header_row_in_sheet(sheet, header_indicators)
        headers = sheet.row(header_row_idx).map { |h| h&.to_s&.strip }
        on_headers_found(headers) if respond_to?(:on_headers_found, true)

        Rails.logger.info("#{self.class.name}: Found headers at row #{header_row_idx}")

        ((header_row_idx + 1)..sheet.last_row).each do |row_idx|
          row = sheet.row(row_idx)
          next if row.nil? || row.all?(&:nil?)

          row_hash = row_to_hash(row, headers)
          yield row_hash, headers
        end
      rescue => e
        @errors ||= []
        @errors << "XLS parsing error: #{e.message}"
        Rails.logger.error("XLS parsing error: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
      end

      private

      def detect_header_row?(row_text, indicators = nil)
        indicators ||= default_header_indicators
        text_lower = row_text.downcase

        # Check for at least 2 indicator matches
        matches = indicators.count { |ind| text_lower.include?(ind.downcase) }
        return true if matches >= 2

        # Also check for common patterns
        has_date = text_lower.include?('date')
        has_amount = text_lower.include?('amount') || text_lower.include?('debit') ||
                     text_lower.include?('credit') || text_lower.include?('withdrawal')

        has_date && has_amount
      end

      def default_header_indicators
        ['Date', 'Transaction', 'Amount', 'Description', 'Narration']
      end

      def find_header_row_in_sheet(sheet, indicators = nil)
        indicators ||= default_header_indicators

        (1..30).each do |row_idx|
          row = sheet.row(row_idx)
          next unless row

          row_text = row.compact.map(&:to_s).join(' ')
          return row_idx if detect_header_row?(row_text, indicators)
        end

        1 # Default to second row
      end
    end
  end
end
