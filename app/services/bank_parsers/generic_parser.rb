# frozen_string_literal: true

module BankParsers
  class GenericParser < BaseParser
    def parse
      case File.extname(file_path).downcase
      when '.csv'
        parse_csv
      when '.xls'
        parse_xls
      when '.xlsx'
        parse_xlsx
      else
        @errors << "Unsupported file format"
        []
      end
    end

    private

    def parse_csv
      require 'csv'

      transactions = []
      skip_rows = parser_config[:skip_rows].to_i

      CSV.foreach(file_path, headers: true, skip_blanks: true, liberal_parsing: true) do |row|
        next if skip_rows > 0 && $. <= skip_rows + 1 # +1 for header

        data = extract_transaction_data(row.to_h.with_indifferent_access)
        transactions << data if valid_transaction_row?(data)
      end

      transactions
    rescue => e
      @errors << "CSV parsing error: #{e.message}"
      []
    end

    def parse_xls
      doc = Roo::Excel.new(file_path)
      parse_spreadsheet(doc)
    rescue => e
      @errors << "XLS parsing error: #{e.message}"
      []
    end

    def parse_xlsx
      doc = Roo::Excelx.new(file_path)
      parse_spreadsheet(doc)
    rescue => e
      @errors << "XLSX parsing error: #{e.message}"
      []
    end

    def parse_spreadsheet(doc)
      sheet = doc.sheet(0)
      transactions = []

      # Find header row
      header_indicators = [
        column_mappings[:date],
        column_mappings[:narration],
        column_mappings[:description],
        'date', 'transaction', 'narration'
      ].compact

      header_row_idx = parser_config[:header_row] || find_header_row(sheet, header_indicators)
      headers = sheet.row(header_row_idx)

      ((header_row_idx + 1)..sheet.last_row).each do |row_idx|
        row = sheet.row(row_idx)
        next if row.all?(&:nil?)

        row_hash = row_to_hash(row, headers)
        data = extract_transaction_data(row_hash)
        transactions << data if valid_transaction_row?(data)
      end

      transactions
    end

    def extract_transaction_data(row)
      mappings = column_mappings

      # Get date
      date_col = mappings[:date] || mappings[:transaction_date] || mappings[:txn_date]
      transaction_date = parse_date(row[date_col])

      # Get description
      desc_col = mappings[:narration] || mappings[:description] || mappings[:particulars]
      description = clean_description(row[desc_col])

      # Get reference
      ref_col = mappings[:reference] || mappings[:chq_no] || mappings[:ref_no]
      reference = row[ref_col]&.to_s&.strip

      # Get amount and type
      withdrawal_col = mappings[:withdrawal] || mappings[:debit] || mappings[:dr]
      deposit_col = mappings[:deposit] || mappings[:credit] || mappings[:cr]
      amount_col = mappings[:amount]
      cr_dr_col = mappings[:cr_dr]

      transaction_type = determine_transaction_type(row, withdrawal_col, deposit_col, cr_dr_col)
      amount = get_amount(row, withdrawal_col, deposit_col, amount_col)

      # Get balance
      balance_col = mappings[:balance] || mappings[:closing_balance]
      balance = parse_amount(row[balance_col])

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
  end
end
