# frozen_string_literal: true

require_relative 'concerns/xlsx_streaming'

module BankParsers
  class AxisParser < BaseParser
    include Concerns::XlsxStreaming

    HEADER_INDICATORS = ['Tran Date', 'PARTICULARS', 'DR', 'CR', 'BAL'].freeze

    def each_transaction(&block)
      return enum_for(:each_transaction) unless block_given?

      @resolved_header_map = nil
      @cached_skip_patterns = nil

      case File.extname(file_path).downcase
      when '.csv'
        stream_csv(&block)
      when '.xls'
        stream_xls(&block)
      when '.xlsx'
        stream_xlsx(&block)
      else
        @errors << "Unsupported file format for Axis Bank"
      end
    end

    private

    def stream_csv(&block)
      require 'csv'

      headers_found = false
      headers = nil

      CSV.foreach(file_path, encoding: 'UTF-8', liberal_parsing: true, skip_blanks: true).with_index do |row, idx|
        next if row.nil? || row.all?(&:nil?)

        row_text = row.compact.map(&:to_s).join(' ')
        if !headers_found && (row_text.include?('Tran Date') || row_text.include?('PARTICULARS'))
          headers = row.map { |h| h&.to_s&.strip }
          build_resolved_header_map!(headers)
          headers_found = true
          next
        end

        next unless headers_found

        begin
          row_hash = row_to_hash(row, headers)
          next if summary_row?(row_hash)
          data = extract_axis_transaction(row_hash)
          yield data if valid_transaction_row?(data)
        rescue => e
          Rails.logger.warn("Axis CSV error at line #{idx}: #{e.message}")
          next
        end
      end
    rescue => e
      @errors << "Axis CSV parsing error: #{e.message}"
    end

    def stream_xls(&block)
      stream_xls_with_roo(header_indicators: HEADER_INDICATORS) do |row_hash, _|
        next if summary_row?(row_hash)
        data = extract_axis_transaction(row_hash)
        yield data if valid_transaction_row?(data)
      end
    end

    def stream_xlsx(&block)
      stream_xlsx_with_creek(header_indicators: HEADER_INDICATORS) do |row_hash, _|
        next if summary_row?(row_hash)
        data = extract_axis_transaction(row_hash)
        yield data if valid_transaction_row?(data)
      end
    end

    def on_headers_found(headers)
      build_resolved_header_map!(headers)
    end

    def build_resolved_header_map!(headers)
      @resolved_header_map = {}
      normalized_index = headers.each_with_index.to_h { |h, i| [h&.downcase&.strip, headers[i]] }

      {
        date: ['tran date', 'transaction date', 'date'],
        narration: ['particulars', 'description'],
        reference: ['chqno', 'cheque no', 'reference'],
        debit: ['dr', 'debit'],
        credit: ['cr', 'credit'],
        balance: ['bal', 'balance']
      }.each do |key, candidates|
        candidates.each do |c|
          if normalized_index[c]
            @resolved_header_map[key] = normalized_index[c]
            break
          end
        end
      end
    end

    def get_fast(row, key)
      col = @resolved_header_map&.[](key)
      col ? row[col] : nil
    end

    def cached_skip_patterns
      @cached_skip_patterns ||= ['opening balance', 'closing balance', 'total'].freeze
    end

    def summary_row?(row)
      particulars = get_fast(row, :narration)&.to_s&.downcase || ''
      return true if particulars.blank?
      cached_skip_patterns.any? { |p| particulars.include?(p) }
    end

    def extract_axis_transaction(row)
      date = parse_date(get_fast(row, :date))
      narration = clean_description(get_fast(row, :narration))
      reference = get_fast(row, :reference)&.to_s&.strip

      debit = parse_amount(get_fast(row, :debit))
      credit = parse_amount(get_fast(row, :credit))

      if credit > 0
        transaction_type = 'credit'
        amount = credit
      else
        transaction_type = 'debit'
        amount = debit
      end

      balance = parse_amount(get_fast(row, :balance))

      {
        transaction_date: date,
        original_description: narration,
        description: narration.truncate(250),
        amount: amount,
        transaction_type: transaction_type,
        balance: balance,
        reference: reference,
        metadata: { bank: 'axis', account_type: template.account_type, source: 'statement_import', template_id: template.id }
      }
    end
  end
end
