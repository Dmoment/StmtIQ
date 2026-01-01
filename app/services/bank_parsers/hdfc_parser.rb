# frozen_string_literal: true

require_relative 'concerns/xlsx_streaming'

module BankParsers
  class HdfcParser < BaseParser
    include Concerns::XlsxStreaming

    HEADER_INDICATORS = ['Date', 'Narration', 'Closing Balance', 'Withdrawal', 'Deposit'].freeze

    # ============================================
    # Streaming API (ONLY way to parse)
    # ============================================

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
        @errors << "Unsupported file format for HDFC"
      end
    end

    private

    # ✅ TRUE STREAMING
    def stream_csv(&block)
      require 'csv'

      headers_found = false
      headers = nil

      CSV.foreach(
        file_path,
        encoding: 'UTF-8',
        liberal_parsing: true,
        skip_blanks: true
      ).with_index do |row, idx|
        next if row.nil? || row.all?(&:nil?)

        row_text = row.compact.map(&:to_s).join(' ')
        if !headers_found && row_text.include?('Date') && row_text.include?('Narration')
          headers = row.map { |h| h&.to_s&.strip }
          build_resolved_header_map!(headers)
          headers_found = true
          next
        end

        next unless headers_found

        begin
          row_hash = row_to_hash(row, headers)
          next if summary_row?(row_hash)

          data = extract_hdfc_transaction(row_hash)
          yield data if valid_transaction_row?(data)
        rescue => e
          Rails.logger.warn("HDFC CSV row parse error at line #{idx}: #{e.message}")
          next
        end
      end
    rescue => e
      @errors << "HDFC CSV parsing error: #{e.message}"
    end

    # ⚠️ XLS: Roo with size limit
    def stream_xls(&block)
      stream_xls_with_roo(header_indicators: HEADER_INDICATORS) do |row_hash, _headers|
        next if summary_row?(row_hash)
        data = extract_hdfc_transaction(row_hash)
        yield data if valid_transaction_row?(data)
      end
    end

    # ✅ XLSX: True streaming with Creek
    def stream_xlsx(&block)
      stream_xlsx_with_creek(header_indicators: HEADER_INDICATORS) do |row_hash, _headers|
        next if summary_row?(row_hash)
        data = extract_hdfc_transaction(row_hash)
        yield data if valid_transaction_row?(data)
      end
    end

    # Called by XlsxStreaming concern when headers are found
    def on_headers_found(headers)
      build_resolved_header_map!(headers)
    end

    # ============================================
    # Header Resolution
    # ============================================

    def build_resolved_header_map!(headers)
      @resolved_header_map = {}
      normalized_index = headers.each_with_index.to_h { |h, i| [h&.downcase&.strip, headers[i]] }

      {
        date: ['date'],
        narration: ['narration'],
        reference: ['chq./ref.no.', 'chq./ref. no.'],
        withdrawal: ['withdrawal amt.', 'withdrawal amount', 'dr'],
        deposit: ['deposit amt.', 'deposit amount', 'cr'],
        balance: ['closing balance', 'balance'],
        value_date: ['value dt']
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

    # ============================================
    # Skip Detection
    # ============================================

    def cached_skip_patterns
      @cached_skip_patterns ||= [
        'opening balance', 'closing balance', 'total', 'statement summary'
      ].freeze
    end

    def summary_row?(row)
      narration = (get_fast(row, :narration) || row.values.first)&.to_s&.downcase || ''
      cached_skip_patterns.any? { |p| narration.include?(p) }
    end

    # ============================================
    # Transaction Extraction
    # ============================================

    def extract_hdfc_transaction(row)
      date = parse_date(get_fast(row, :date))
      narration = clean_description(get_fast(row, :narration))
      reference = get_fast(row, :reference)&.to_s&.strip

      withdrawal = parse_amount(get_fast(row, :withdrawal))
      deposit = parse_amount(get_fast(row, :deposit))

      if deposit > 0
        transaction_type = 'credit'
        amount = deposit
      else
        transaction_type = 'debit'
        amount = withdrawal
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
        metadata: {
          bank: 'hdfc',
          account_type: template.account_type,
          source: 'statement_import',
          template_id: template.id,
          value_date: get_fast(row, :value_date)&.to_s
        }
      }
    end
  end
end
