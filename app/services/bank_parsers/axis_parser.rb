# frozen_string_literal: true

module BankParsers
  class AxisParser < BaseParser
    def parse
      case File.extname(file_path).downcase
      when '.csv'
        parse_csv
      when '.xls'
        parse_xls
      when '.xlsx'
        parse_xlsx
      else
        @errors << "Unsupported file format for Axis Bank"
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

        if !data_started && (line.include?('Tran Date') || line.include?('PARTICULARS'))
          headers = CSV.parse_line(line)
          data_started = true
          next
        end

        next unless data_started && headers

        begin
          row = CSV.parse_line(line)
          next if row.nil? || row.all?(&:nil?)

          row_hash = row_to_hash(row, headers)
          data = extract_axis_transaction(row_hash)
          transactions << data if valid_transaction_row?(data)
        rescue => e
          Rails.logger.warn("Axis CSV row parse error at line #{idx}: #{e.message}")
          next
        end
      end

      transactions
    rescue => e
      @errors << "Axis CSV parsing error: #{e.message}"
      []
    end

    def parse_xls
      doc = Roo::Excel.new(file_path)
      parse_spreadsheet(doc)
    rescue => e
      @errors << "Axis XLS parsing error: #{e.message}"
      []
    end

    def parse_xlsx
      doc = Roo::Excelx.new(file_path)
      parse_spreadsheet(doc)
    rescue => e
      @errors << "Axis XLSX parsing error: #{e.message}"
      []
    end

    def parse_spreadsheet(doc)
      sheet = doc.sheet(0)
      transactions = []

      header_indicators = ['Tran Date', 'PARTICULARS', 'DR', 'CR', 'BAL']
      header_row_idx = find_header_row(sheet, header_indicators)
      headers = sheet.row(header_row_idx).map { |h| h&.to_s&.strip }

      ((header_row_idx + 1)..sheet.last_row).each do |row_idx|
        row = sheet.row(row_idx)
        next if row.all?(&:nil?)

        row_hash = row_to_hash(row, headers)
        next if summary_row?(row_hash)

        data = extract_axis_transaction(row_hash)
        transactions << data if valid_transaction_row?(data)
      end

      transactions
    end

    def extract_axis_transaction(row)
      date = parse_date(row['Tran Date'] || row['Transaction Date'] || row['Date'])

      narration = clean_description(row['PARTICULARS'] || row['Particulars'] || row['Description'])
      reference = (row['CHQNO'] || row['Cheque No'] || row['Reference'])&.to_s&.strip

      # Axis uses DR/CR columns
      debit = parse_amount(row['DR'] || row['Debit'])
      credit = parse_amount(row['CR'] || row['Credit'])

      if credit > 0
        transaction_type = 'credit'
        amount = credit
      else
        transaction_type = 'debit'
        amount = debit
      end

      balance = parse_amount(row['BAL'] || row['Balance'])

      {
        transaction_date: date,
        original_description: narration,
        description: narration.truncate(250),
        amount: amount,
        transaction_type: transaction_type,
        balance: balance,
        reference: reference,
        metadata: {
          bank: 'axis',
          account_type: template.account_type,
          source: 'statement_import',
          template_id: template.id
        }
      }
    end

    def summary_row?(row)
      particulars = (row['PARTICULARS'] || row['Particulars'] || '')&.to_s&.downcase
      particulars.include?('opening balance') ||
        particulars.include?('closing balance') ||
        particulars.include?('total') ||
        particulars.blank?
    end
  end
end
