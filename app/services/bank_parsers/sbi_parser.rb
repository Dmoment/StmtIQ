# frozen_string_literal: true

module BankParsers
  class SbiParser < BaseParser
    def parse
      case File.extname(file_path).downcase
      when '.csv'
        parse_csv
      when '.xls'
        parse_xls
      when '.xlsx'
        parse_xlsx
      else
        @errors << "Unsupported file format for SBI"
        []
      end
    end

    private

    def parse_csv
      require 'csv'

      transactions = []
      headers = nil
      data_started = false

      File.readlines(file_path, encoding: 'UTF-8').each_with_index do |line, idx|
        next if line.strip.empty?

        # SBI CSV often has a specific format
        if !data_started && (line.include?('Txn Date') || line.include?('Transaction Date'))
          headers = CSV.parse_line(line)
          data_started = true
          next
        end

        next unless data_started && headers

        begin
          row = CSV.parse_line(line)
          next if row.nil? || row.all?(&:nil?)

          row_hash = row_to_hash(row, headers)
          data = extract_sbi_transaction(row_hash)
          transactions << data if valid_transaction_row?(data)
        rescue => e
          Rails.logger.warn("SBI CSV row parse error at line #{idx}: #{e.message}")
          next
        end
      end

      transactions
    rescue => e
      @errors << "SBI CSV parsing error: #{e.message}"
      []
    end

    def parse_xls
      doc = Roo::Excel.new(file_path)
      parse_spreadsheet(doc)
    rescue => e
      @errors << "SBI XLS parsing error: #{e.message}"
      []
    end

    def parse_xlsx
      doc = Roo::Excelx.new(file_path)
      parse_spreadsheet(doc)
    rescue => e
      @errors << "SBI XLSX parsing error: #{e.message}"
      []
    end

    def parse_spreadsheet(doc)
      sheet = doc.sheet(0)
      transactions = []

      header_indicators = ['Txn Date', 'Value Date', 'Description', 'Debit', 'Credit']
      header_row_idx = find_header_row(sheet, header_indicators)
      headers = sheet.row(header_row_idx).map { |h| h&.to_s&.strip }

      ((header_row_idx + 1)..sheet.last_row).each do |row_idx|
        row = sheet.row(row_idx)
        next if row.all?(&:nil?)

        row_hash = row_to_hash(row, headers)
        next if summary_row?(row_hash)

        data = extract_sbi_transaction(row_hash)
        transactions << data if valid_transaction_row?(data)
      end

      transactions
    end

    def extract_sbi_transaction(row)
      # SBI date format: "12 Jan 2024" or "12/01/2024"
      date = parse_date(row['Txn Date'] || row['Transaction Date'] || row['Date'])

      narration = clean_description(row['Description'] || row['Narration'] || row['Particulars'])
      reference = (row['Ref No./Cheque No.'] || row['Reference'] || row['Chq No'])&.to_s&.strip

      # SBI uses separate Debit/Credit columns
      debit = parse_amount(row['Debit'] || row['Withdrawal'])
      credit = parse_amount(row['Credit'] || row['Deposit'])

      if credit > 0
        transaction_type = 'credit'
        amount = credit
      else
        transaction_type = 'debit'
        amount = debit
      end

      balance = parse_amount(row['Balance'] || row['Closing Balance'])

      {
        transaction_date: date,
        original_description: narration,
        description: narration.truncate(250),
        amount: amount,
        transaction_type: transaction_type,
        balance: balance,
        reference: reference,
        metadata: {
          bank: 'sbi',
          account_type: template.account_type,
          source: 'statement_import',
          template_id: template.id,
          value_date: row['Value Date']&.to_s
        }
      }
    end

    def summary_row?(row)
      desc = (row['Description'] || row['Narration'] || '')&.to_s&.downcase
      desc.include?('opening balance') ||
        desc.include?('closing balance') ||
        desc.include?('total') ||
        desc.blank?
    end

    # Override date parsing for SBI's unique format
    def parse_date(value)
      return nil if value.blank?

      case value
      when Date, DateTime, Time
        value.to_date
      when Numeric
        Date.new(1899, 12, 30) + value.to_i.days
      when String
        # Try SBI-specific formats first
        sbi_formats = ['%d %b %Y', '%d-%b-%Y', '%d/%m/%Y', '%d-%m-%Y']
        sbi_formats.each do |fmt|
          begin
            return Date.strptime(value.strip, fmt)
          rescue ArgumentError
            next
          end
        end
        # Fallback
        super(value)
      else
        nil
      end
    rescue => e
      Rails.logger.warn("SBI date parse error for '#{value}': #{e.message}")
      nil
    end
  end
end
