# frozen_string_literal: true

module BankParsers
  class HdfcParser < BaseParser
    def parse
      case File.extname(file_path).downcase
      when '.csv'
        parse_csv
      when '.xls'
        parse_xls
      when '.xlsx'
        parse_xlsx
      else
        @errors << "Unsupported file format for HDFC"
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
        # Skip empty lines
        next if line.strip.empty?

        # Look for header row
        if !data_started && line.include?('Date') && line.include?('Narration')
          headers = CSV.parse_line(line)
          data_started = true
          next
        end

        next unless data_started && headers

        begin
          row = CSV.parse_line(line)
          next if row.nil? || row.all?(&:nil?)

          row_hash = row_to_hash(row, headers)
          data = extract_hdfc_transaction(row_hash)
          transactions << data if valid_transaction_row?(data)
        rescue => e
          Rails.logger.warn("HDFC CSV row parse error at line #{idx}: #{e.message}")
          next
        end
      end

      transactions
    rescue => e
      @errors << "HDFC CSV parsing error: #{e.message}"
      []
    end

    def parse_xls
      doc = Roo::Excel.new(file_path)
      parse_spreadsheet(doc)
    rescue => e
      @errors << "HDFC XLS parsing error: #{e.message}"
      []
    end

    def parse_xlsx
      doc = Roo::Excelx.new(file_path)
      parse_spreadsheet(doc)
    rescue => e
      @errors << "HDFC XLSX parsing error: #{e.message}"
      []
    end

    def parse_spreadsheet(doc)
      sheet = doc.sheet(0)
      transactions = []

      # Find header row containing 'Date' and 'Narration'
      header_row_idx = find_header_row(sheet, ['Date', 'Narration', 'Closing Balance'])
      headers = sheet.row(header_row_idx)

      ((header_row_idx + 1)..sheet.last_row).each do |row_idx|
        row = sheet.row(row_idx)
        next if row.all?(&:nil?)

        # Skip summary rows (usually have less columns filled)
        filled_cells = row.compact.count
        next if filled_cells < 3

        row_hash = row_to_hash(row, headers)

        # Skip if it looks like a summary row
        next if summary_row?(row_hash)

        data = extract_hdfc_transaction(row_hash)
        transactions << data if valid_transaction_row?(data)
      end

      transactions
    end

    def extract_hdfc_transaction(row)
      # HDFC column names
      date = parse_date(row['Date'])
      narration = clean_description(row['Narration'])
      reference = row['Chq./Ref.No.']&.to_s&.strip || row['Chq./Ref. No.']&.to_s&.strip

      # HDFC uses separate columns for withdrawal and deposit
      withdrawal = parse_amount(row['Withdrawal Amt.'] || row['Withdrawal Amount'] || row['Dr'])
      deposit = parse_amount(row['Deposit Amt.'] || row['Deposit Amount'] || row['Cr'])

      # Determine transaction type and amount
      if deposit > 0
        transaction_type = 'credit'
        amount = deposit
      else
        transaction_type = 'debit'
        amount = withdrawal
      end

      balance = parse_amount(row['Closing Balance'] || row['Balance'])

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
          value_date: row['Value Dt']&.to_s
        }
      }
    end

    def summary_row?(row)
      # Check if this is a summary/total row
      narration = row['Narration']&.to_s&.downcase || ''
      narration.include?('opening balance') ||
        narration.include?('closing balance') ||
        narration.include?('total') ||
        narration.include?('statement summary')
    end
  end
end
