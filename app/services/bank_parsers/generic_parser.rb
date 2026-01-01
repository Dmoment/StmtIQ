# frozen_string_literal: true

require_relative 'concerns/xlsx_streaming'

module BankParsers
  class GenericParser < BaseParser
    include Concerns::XlsxStreaming

    # ============================================
    # Streaming API (ONLY way to parse)
    # ============================================

    def each_transaction(&block)
      return enum_for(:each_transaction) unless block_given?

      @resolved_header_map = nil

      case File.extname(file_path).downcase
      when '.csv'
        stream_csv(&block)
      when '.xls'
        stream_xls(&block)
      when '.xlsx'
        stream_xlsx(&block)
      else
        @errors << "Unsupported file format"
      end
    end

    private

    def header_indicators
      [
        column_mappings[:date],
        column_mappings[:narration],
        column_mappings[:description],
        'date', 'transaction', 'narration', 'amount'
      ].compact
    end

    # ✅ TRUE STREAMING: Uses CSV.foreach
    def stream_csv(&block)
      require 'csv'

      skip_rows = parser_config[:skip_rows].to_i
      row_count = 0
      headers_built = false

      CSV.foreach(
        file_path,
        headers: true,
        skip_blanks: true,
        liberal_parsing: true
      ) do |row|
        row_count += 1
        next if skip_rows > 0 && row_count <= skip_rows

        unless headers_built
          build_resolved_header_map!(row.headers)
          headers_built = true
        end

        row_hash = row.to_h.with_indifferent_access
        data = extract_transaction_data(row_hash)
        yield data if valid_transaction_row?(data)
      end
    rescue => e
      @errors << "CSV parsing error: #{e.message}"
    end

    # ⚠️ XLS: Roo with size limit
    def stream_xls(&block)
      stream_xls_with_roo(header_indicators: header_indicators) do |row_hash, _headers|
        data = extract_transaction_data(row_hash)
        yield data if valid_transaction_row?(data)
      end
    end

    # ✅ XLSX: True streaming with Creek
    def stream_xlsx(&block)
      stream_xlsx_with_creek(header_indicators: header_indicators) do |row_hash, _headers|
        data = extract_transaction_data(row_hash)
        yield data if valid_transaction_row?(data)
      end
    end

    def on_headers_found(headers)
      build_resolved_header_map!(headers)
    end

    # ============================================
    # Header Resolution (O(1) lookups)
    # ============================================

    def build_resolved_header_map!(headers)
      @resolved_header_map = {}
      mappings = column_mappings

      normalized_index = headers.each_with_index.to_h do |h, i|
        [h&.to_s&.downcase&.strip, headers[i]]
      end

      {
        date: [mappings[:date], mappings[:transaction_date], mappings[:txn_date], 'date'].compact,
        narration: [mappings[:narration], mappings[:description], mappings[:particulars], 'narration', 'description'].compact,
        reference: [mappings[:reference], mappings[:chq_no], mappings[:ref_no], 'reference'].compact,
        withdrawal: [mappings[:withdrawal], mappings[:debit], mappings[:dr], 'withdrawal', 'debit'].compact,
        deposit: [mappings[:deposit], mappings[:credit], mappings[:cr], 'deposit', 'credit'].compact,
        amount: [mappings[:amount], 'amount'].compact,
        balance: [mappings[:balance], mappings[:closing_balance], 'balance'].compact,
        cr_dr: [mappings[:cr_dr], 'cr/dr', 'type'].compact
      }.each do |key, candidates|
        candidates.each do |c|
          normalized = c.to_s.downcase.strip
          if normalized_index[normalized]
            @resolved_header_map[key] = normalized_index[normalized]
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
    # Transaction Extraction
    # ============================================

    def extract_transaction_data(row)
      transaction_date = parse_date(get_fast(row, :date))
      description = clean_description(get_fast(row, :narration))
      reference = get_fast(row, :reference)&.to_s&.strip

      withdrawal = parse_amount(get_fast(row, :withdrawal))
      deposit = parse_amount(get_fast(row, :deposit))
      amount_col = parse_amount(get_fast(row, :amount))
      cr_dr = get_fast(row, :cr_dr)

      if deposit > 0
        transaction_type = 'credit'
        amount = deposit
      elsif withdrawal > 0
        transaction_type = 'debit'
        amount = withdrawal
      elsif amount_col > 0
        transaction_type = determine_type_from_cr_dr(cr_dr) || 'debit'
        amount = amount_col
      else
        transaction_type = 'debit'
        amount = 0
      end

      balance = parse_amount(get_fast(row, :balance))

      {
        transaction_date: transaction_date,
        original_description: description,
        description: description.truncate(250),
        amount: amount,
        transaction_type: transaction_type,
        balance: balance,
        reference: reference,
        metadata: {
          bank: template.bank_code,
          account_type: template.account_type,
          source: 'statement_import',
          template_id: template.id
        }
      }
    end

    def determine_type_from_cr_dr(value)
      return nil if value.blank?
      normalized = value.to_s.strip.downcase
      return 'credit' if normalized.start_with?('cr', 'c')
      return 'debit' if normalized.start_with?('dr', 'd')
      nil
    end
  end
end
