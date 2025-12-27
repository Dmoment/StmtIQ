# frozen_string_literal: true

class StatementParser
  class ParseError < StandardError; end

  SUPPORTED_FORMATS = %w[csv xlsx xls pdf].freeze

  # Bank-specific column mappings
  BANK_MAPPINGS = {
    icici: {
      date_columns: ['value date', 'txn posted date', 'date'],
      description_columns: ['description', 'particulars', 'narration'],
      amount_columns: ['transaction amount(inr)', 'transaction amount', 'amount'],
      type_columns: ['cr/dr', 'dr/cr', 'type'],
      balance_columns: ['available balance(inr)', 'available balance', 'balance'],
      reference_columns: ['transaction id', 'txn id', 'reference', 'ref no']
    },
    hdfc: {
      date_columns: ['date', 'value date', 'txn date'],
      description_columns: ['narration', 'description', 'particulars'],
      amount_columns: ['withdrawal amt', 'deposit amt', 'amount'],
      type_columns: ['dr/cr'],
      balance_columns: ['closing balance', 'balance'],
      reference_columns: ['chq/ref number', 'reference']
    },
    sbi: {
      date_columns: ['txn date', 'value date', 'date'],
      description_columns: ['description', 'particulars'],
      amount_columns: ['debit', 'credit', 'amount'],
      type_columns: [],
      balance_columns: ['balance'],
      reference_columns: ['ref no./cheque no.']
    },
    generic: {
      date_columns: ['date', 'transaction date', 'txn date', 'value date', 'posting date'],
      description_columns: ['description', 'narration', 'particulars', 'details', 'remarks'],
      amount_columns: ['amount', 'transaction amount', 'debit', 'credit', 'withdrawal', 'deposit'],
      type_columns: ['type', 'dr/cr', 'cr/dr', 'transaction type'],
      balance_columns: ['balance', 'closing balance', 'available balance', 'running balance'],
      reference_columns: ['reference', 'ref no', 'txn id', 'transaction id', 'cheque no']
    }
  }.freeze

  def initialize(statement)
    @statement = statement
    @detected_bank = nil
  end

  def parse!
    @statement.mark_processing!

    transactions = case @statement.file_type.downcase
                   when 'csv'
                     parse_csv
                   when 'xlsx', 'xls'
                     parse_excel
                   when 'pdf'
                     parse_pdf
                   else
                     raise ParseError, "Unsupported file format: #{@statement.file_type}"
                   end

    create_transactions(transactions)

    @statement.update!(metadata: (@statement.metadata || {}).merge(
      'detected_bank' => @detected_bank,
      'parsed_count' => transactions.size
    ))
    @statement.mark_parsed!

    { success: true, count: transactions.size, bank: @detected_bank }
  rescue StandardError => e
    Rails.logger.error("Statement parsing failed: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    @statement.mark_failed!(e.message)
    { success: false, error: e.message }
  end

  private

  def file_content
    @file_content ||= if @statement.file.attached?
                        @statement.file.download
                      else
                        raise ParseError, "No file attached to statement"
                      end
  end

  def parse_csv
    require 'csv'

    rows = CSV.parse(file_content, headers: true, liberal_parsing: true)
    detect_bank(rows.headers)
    normalize_rows(rows)
  end

  def parse_excel
    require 'roo'

    # Write temp file for roo
    temp_file = Tempfile.new(['statement', ".#{@statement.file_type}"])
    temp_file.binmode
    temp_file.write(file_content)
    temp_file.rewind

    spreadsheet = case @statement.file_type.downcase
                  when 'xlsx'
                    Roo::Excelx.new(temp_file.path)
                  when 'xls'
                    Roo::Excel.new(temp_file.path)
                  end

    # Find the header row (might not be the first row)
    header_row_index = find_header_row(spreadsheet)

    if header_row_index.nil?
      temp_file.close
      temp_file.unlink
      raise ParseError, "Could not find header row in spreadsheet"
    end

    # Get headers from the detected header row
    headers = spreadsheet.row(header_row_index).map { |h| h&.to_s&.strip&.downcase }
    detect_bank(headers)

    rows = []
    ((header_row_index + 1)..spreadsheet.last_row).each do |i|
      row_data = spreadsheet.row(i)
      next if row_data.all?(&:nil?) # Skip empty rows

      row_hash = {}
      headers.each_with_index do |header, idx|
        row_hash[header] = row_data[idx] if header.present?
      end
      rows << row_hash
    end

    temp_file.close
    temp_file.unlink

    normalize_rows(rows)
  end

  def find_header_row(spreadsheet)
    # Look for common header keywords in first 20 rows
    header_keywords = ['date', 'description', 'amount', 'balance', 'narration', 'particulars',
                       'transaction', 'debit', 'credit', 'cr/dr', 'dr/cr', 'value date']

    (1..[spreadsheet.last_row, 20].min).each do |row_num|
      row = spreadsheet.row(row_num).map { |cell| cell&.to_s&.strip&.downcase }
      matches = row.count { |cell| header_keywords.any? { |kw| cell&.include?(kw) } }

      # If we find at least 3 header-like columns, this is likely the header row
      return row_num if matches >= 3
    end

    # Default to first row if no header detected
    1
  end

  def detect_bank(headers)
    headers_str = headers.map { |h| h&.to_s&.downcase }.join(' ')

    if headers_str.include?('transaction id') && headers_str.include?('cr/dr')
      @detected_bank = 'icici'
    elsif headers_str.include?('narration') && headers_str.include?('chq')
      @detected_bank = 'hdfc'
    elsif headers_str.include?('txn date') && headers_str.include?('ref no')
      @detected_bank = 'sbi'
    else
      @detected_bank = 'generic'
    end

    Rails.logger.info("Detected bank format: #{@detected_bank}")
  end

  def bank_mapping
    BANK_MAPPINGS[@detected_bank&.to_sym] || BANK_MAPPINGS[:generic]
  end

  def parse_pdf
    require 'pdf-reader'

    temp_file = Tempfile.new(['statement', '.pdf'])
    temp_file.binmode
    temp_file.write(file_content)
    temp_file.rewind

    reader = PDF::Reader.new(temp_file.path)
    text = reader.pages.map(&:text).join("\n")

    temp_file.close
    temp_file.unlink

    @detected_bank = 'pdf_extracted'
    extract_transactions_from_text(text)
  end

  def normalize_rows(rows)
    rows.map do |row|
      row_hash = row.to_h.transform_keys { |k| k&.to_s&.strip&.downcase }

      {
        date: extract_date(row_hash),
        description: extract_description(row_hash),
        amount: extract_amount(row_hash),
        type: extract_type(row_hash),
        balance: extract_balance(row_hash),
        reference: extract_reference(row_hash)
      }
    end.compact.reject { |t| t[:date].nil? || t[:amount].nil? || t[:amount] == 0 }
  end

  def find_column_value(row, column_names)
    column_names.each do |col_name|
      # Try exact match first
      return row[col_name] if row[col_name].present?

      # Try partial match
      row.each do |key, value|
        return value if key&.include?(col_name) && value.present?
      end
    end
    nil
  end

  def extract_date(row)
    value = find_column_value(row, bank_mapping[:date_columns])
    return nil unless value
    parse_date(value)
  end

  def parse_date(value)
    return value if value.is_a?(Date)
    return value.to_date if value.is_a?(DateTime) || value.is_a?(Time)

    str = value.to_s.strip

    # Handle datetime strings like "05/11/2025 02:00:02 AM"
    str = str.split(' ').first if str.include?(':')

    # Common Indian date formats
    formats = [
      '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y',  # Indian format (DD/MM/YYYY)
      '%Y-%m-%d', '%Y/%m/%d',               # ISO format
      '%d/%m/%y', '%d-%m-%y',               # Short year
      '%d %b %Y', '%d %B %Y',               # Named months
      '%b %d, %Y', '%B %d, %Y'
    ]

    formats.each do |format|
      begin
        return Date.strptime(str, format)
      rescue ArgumentError
        next
      end
    end

    # Try Ruby's default parsing as last resort
    Date.parse(str)
  rescue ArgumentError
    nil
  end

  def extract_description(row)
    find_column_value(row, bank_mapping[:description_columns])&.to_s&.strip
  end

  def extract_amount(row)
    # First check for Cr/Dr type to determine if we need separate columns
    type_val = find_column_value(row, bank_mapping[:type_columns])&.to_s&.upcase

    # For ICICI-style with single amount column and Cr/Dr indicator
    if type_val.present?
      amount_val = find_column_value(row, bank_mapping[:amount_columns])
      return parse_amount(amount_val)
    end

    # For banks with separate Debit/Credit columns
    debit_cols = ['debit', 'withdrawal', 'withdrawal amt', 'dr']
    credit_cols = ['credit', 'deposit', 'deposit amt', 'cr']

    debit = find_column_value(row, debit_cols)
    credit = find_column_value(row, credit_cols)

    if debit.present? || credit.present?
      debit_val = parse_amount(debit)
      credit_val = parse_amount(credit)
      return (credit_val || 0) - (debit_val || 0)
    end

    # Single amount column
    amount_val = find_column_value(row, bank_mapping[:amount_columns])
    parse_amount(amount_val)
  end

  def parse_amount(value)
    return nil unless value.present?
    return value.to_f if value.is_a?(Numeric)

    # Remove currency symbols, commas, and spaces
    str = value.to_s.strip.gsub(/[₹$€£,\s]/, '')

    # Handle negative amounts in parentheses: (1000) = -1000
    if str =~ /^\(([\d.]+)\)$/
      return -$1.to_f
    end

    # Handle trailing minus
    if str =~ /^([\d.]+)-$/
      return -$1.to_f
    end

    str.to_f
  end

  def extract_type(row)
    type_val = find_column_value(row, bank_mapping[:type_columns])&.to_s&.strip&.upcase

    case type_val
    when 'DR', 'D', 'DEBIT'
      'debit'
    when 'CR', 'C', 'CREDIT'
      'credit'
    else
      # Try to infer from separate debit/credit columns
      debit = find_column_value(row, ['debit', 'withdrawal', 'dr'])
      credit = find_column_value(row, ['credit', 'deposit', 'cr'])

      if parse_amount(debit).to_f > 0
        'debit'
      elsif parse_amount(credit).to_f > 0
        'credit'
      else
        nil
      end
    end
  end

  def extract_balance(row)
    value = find_column_value(row, bank_mapping[:balance_columns])
    parse_amount(value)
  end

  def extract_reference(row)
    find_column_value(row, bank_mapping[:reference_columns])&.to_s&.strip
  end

  def extract_transactions_from_text(text)
    transactions = []

    lines = text.split("\n").map(&:strip).reject(&:empty?)

    date_pattern = /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/
    amount_pattern = /[\d,]+\.\d{2}/

    lines.each do |line|
      date_match = line.match(date_pattern)
      next unless date_match

      amounts = line.scan(amount_pattern)
      next if amounts.empty?

      date_end = date_match.end(0)
      first_amount_start = line.index(amounts.first, date_end)
      description = line[date_end...first_amount_start]&.strip

      next if description.blank?

      amount = amounts.length >= 2 ? amounts[-2] : amounts.first
      balance = amounts.length >= 2 ? amounts.last : nil

      transactions << {
        date: parse_date(date_match[0]),
        description: description,
        amount: parse_amount(amount),
        type: nil,
        balance: parse_amount(balance),
        reference: nil
      }
    end

    transactions.reject { |t| t[:date].nil? || t[:amount].nil? }
  end

  def create_transactions(parsed_transactions)
    parsed_transactions.each do |tx|
      tx_type = tx[:type]
      amount = tx[:amount]

      # Determine type from amount if not set
      if tx_type.nil?
        tx_type = amount >= 0 ? 'credit' : 'debit'
      end

      Transaction.create!(
        statement: @statement,
        account: @statement.account,
        user: @statement.user,
        transaction_date: tx[:date],
        description: clean_description(tx[:description]),
        original_description: tx[:description],
        amount: amount.abs,
        transaction_type: tx_type,
        balance: tx[:balance],
        reference: tx[:reference],
        metadata: {
          source: 'statement_import',
          bank: @detected_bank
        }
      )
    end
  end

  def clean_description(description)
    return description if description.blank?

    # Clean up common patterns
    desc = description.to_s.strip

    # Remove multiple spaces
    desc = desc.gsub(/\s+/, ' ')

    # Extract meaningful parts from NEFT/IMPS/UPI descriptions
    if desc.match?(/^(NEFT|IMPS|UPI|MMT|INF|INFT)/i)
      parts = desc.split(/[\/\-]/)
      # Try to find the most meaningful part (usually company/person name)
      meaningful = parts.find { |p| p.length > 3 && !p.match?(/^\d+$/) && !p.match?(/^[A-Z]{4}\d+/) }
      desc = meaningful&.strip || desc
    end

    desc
  end
end
