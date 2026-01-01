# frozen_string_literal: true

module BankParsers
  class BaseParser
    attr_reader :file_path, :template, :errors

    def initialize(file_path, template)
      @file_path = file_path
      @template = template
      @errors = []
    end

    # ============================================
    # Streaming API (ONLY way to parse)
    # ============================================

    # Yields transactions one-by-one. NEVER holds full array in memory.
    # Memory usage stays CONSTANT regardless of file size.
    #
    # Usage:
    #   parser.each_transaction do |tx|
    #     buffer << tx
    #     if buffer.size >= 500
    #       Transaction.insert_all(buffer)
    #       buffer.clear
    #     end
    #   end
    #
    # Subclasses MUST implement this method.
    #
    def each_transaction(&block)
      raise NotImplementedError, "Subclasses must implement #each_transaction"
    end

    # Returns an Enumerator for lazy processing
    def to_enum
      each_transaction
    end

    protected

    def column_mappings
      @template.column_mappings.with_indifferent_access
    end

    def parser_config
      @template.parser_config.with_indifferent_access
    end

    def parse_date(value)
      return nil if value.blank?

      date_format = parser_config[:date_format] || '%d/%m/%Y'

      case value
      when Date, DateTime, Time
        value.to_date
      when Numeric
        # Excel date serial number
        Date.new(1899, 12, 30) + value.to_i.days
      when String
        begin
          Date.strptime(value.strip, date_format)
        rescue ArgumentError
          # Try common formats
          parse_date_with_fallback(value.strip)
        end
      else
        nil
      end
    rescue => e
      Rails.logger.warn("Date parse error for '#{value}': #{e.message}")
      nil
    end

    def parse_date_with_fallback(value)
      formats = [
        '%d/%m/%Y', '%d-%m-%Y', '%d/%m/%y', '%d-%m-%y',
        '%Y-%m-%d', '%d %b %Y', '%d-%b-%Y', '%d %B %Y',
        '%m/%d/%Y', '%Y/%m/%d'
      ]

      formats.each do |fmt|
        begin
          return Date.strptime(value, fmt)
        rescue ArgumentError
          next
        end
      end

      # Last resort: try Date.parse
      Date.parse(value)
    rescue
      nil
    end

    def parse_amount(value)
      return 0.0 if value.blank?

      case value
      when Numeric
        value.to_f.abs
      when String
        # Remove currency symbols, commas, spaces
        cleaned = value.to_s.gsub(/[₹$,\s]/, '').gsub(/[()]/, '')
        # Handle negative indicators
        is_negative = value.include?('-') || value.include?('(')
        amount = cleaned.to_f.abs
        is_negative ? -amount : amount
      else
        0.0
      end
    end

    def determine_transaction_type(row, withdrawal_col, deposit_col, cr_dr_col = nil)
      # If we have a Cr/Dr column, use that
      if cr_dr_col && row[cr_dr_col].present?
        cr_dr = row[cr_dr_col].to_s.strip.downcase
        return 'credit' if cr_dr.start_with?('cr') || cr_dr == 'c'
        return 'debit' if cr_dr.start_with?('dr') || cr_dr == 'd'
      end

      # Otherwise, check withdrawal/deposit columns
      withdrawal = parse_amount(row[withdrawal_col])
      deposit = parse_amount(row[deposit_col])

      if deposit > 0
        'credit'
      elsif withdrawal > 0
        'debit'
      else
        'debit' # Default
      end
    end

    def get_amount(row, withdrawal_col, deposit_col, amount_col = nil)
      if amount_col && row[amount_col].present?
        parse_amount(row[amount_col])
      else
        withdrawal = parse_amount(row[withdrawal_col])
        deposit = parse_amount(row[deposit_col])
        [withdrawal, deposit].max
      end
    end

    def clean_description(value)
      return '' if value.blank?
      value.to_s.strip.gsub(/\s+/, ' ').truncate(500)
    end

    def find_header_row(sheet, header_indicators)
      (0..20).each do |row_idx|
        row = sheet.row(row_idx)
        next unless row

        row_text = row.compact.map(&:to_s).join(' ').downcase
        if header_indicators.any? { |indicator| row_text.include?(indicator.downcase) }
          return row_idx
        end
      end
      0 # Default to first row
    end

    def row_to_hash(row, headers)
      hash = {}
      headers.each_with_index do |header, idx|
        hash[header&.to_s&.strip] = row[idx] if header.present?
      end
      hash.with_indifferent_access
    end

    def valid_transaction_row?(data)
      # Must have a date and either an amount or description
      data[:transaction_date].present? &&
        (data[:amount].present? && data[:amount] > 0 || data[:original_description].present?)
    end
  end
end
