# frozen_string_literal: true

class StatementParser
  SUPPORTED_FORMATS = %w[csv xlsx xls pdf].freeze

  attr_reader :statement, :errors

  def initialize(statement)
    @statement = statement
    @errors = []
  end

  def parse!
    statement.mark_processing!

    unless statement.file.attached?
      statement.mark_failed!('No file attached')
      return { success: false, error: 'No file attached' }
    end

    # Download file to temp location
    file_path = download_to_temp

    # Get the appropriate parser
    parser = create_parser(file_path)

    # Parse transactions
    transactions_data = parser.parse

    if parser.errors.any?
      statement.mark_failed!(parser.errors.join('; '))
      return { success: false, error: parser.errors.join('; ') }
    end

    if transactions_data.empty?
      statement.mark_failed!('No transactions found in statement')
      return { success: false, error: 'No transactions found in statement' }
    end

    # Create transactions
    created_count = create_transactions(transactions_data)

    statement.mark_parsed!
    { success: true, count: created_count }

  rescue StandardError => e
    Rails.logger.error("StatementParser error: #{e.message}\n#{e.backtrace.first(10).join("\n")}")
    statement.mark_failed!(e.message)
    { success: false, error: e.message }
  ensure
    # Clean up temp file
    FileUtils.rm_f(file_path) if file_path && File.exist?(file_path.to_s)
  end

  private

  def download_to_temp
    temp_dir = Rails.root.join('tmp', 'statements')
    FileUtils.mkdir_p(temp_dir)

    # Create temp file with proper extension
    ext = File.extname(statement.file_name)
    temp_path = temp_dir.join("statement_#{statement.id}_#{Time.current.to_i}#{ext}")

    File.open(temp_path, 'wb') do |file|
      file.write(statement.file.download)
    end

    temp_path.to_s
  end

  def create_parser(file_path)
    template = statement.bank_template

    if template
      # Get the parser class from the template
      parser_class = template.parser_class
      Rails.logger.info("Using parser: #{parser_class} for template: #{template.display_name}")
      parser_class.new(file_path, template)
    else
      # Fallback to generic parser with a dummy template
      Rails.logger.warn("No template found for statement #{statement.id}, using GenericParser")
      dummy_template = create_dummy_template
      BankParsers::GenericParser.new(file_path, dummy_template)
    end
  end

  def create_dummy_template
    OpenStruct.new(
      bank_code: 'generic',
      account_type: 'savings',
      column_mappings: {},
      parser_config: {},
      id: nil
    )
  end

  def create_transactions(transactions_data)
    count = 0

    transactions_data.each do |tx_data|
      next unless valid_transaction_data?(tx_data)

      statement.transactions.create!(
        user: statement.user,
        account: statement.account,
        transaction_date: tx_data[:transaction_date],
        description: tx_data[:description],
        original_description: tx_data[:original_description],
        amount: tx_data[:amount],
        transaction_type: tx_data[:transaction_type],
        balance: tx_data[:balance],
        reference: tx_data[:reference],
        metadata: tx_data[:metadata] || {},
        is_reviewed: false
      )
      count += 1
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("Skipping invalid transaction: #{e.message}")
      next
    end

    count
  end

  def valid_transaction_data?(tx_data)
    tx_data[:transaction_date].present? &&
      tx_data[:amount].present? &&
      tx_data[:amount].to_f > 0
  end
end
