# frozen_string_literal: true

class StatementParserJob < ApplicationJob
  queue_as :default

  # Retry with exponential backoff
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(statement_id)
    statement = Statement.find(statement_id)

    Rails.logger.info("Starting to parse statement ##{statement_id} (#{format_file_size(statement)})")

    parser = Parsing::StreamingParser.new(statement)
    result = parser.parse!

    Rails.logger.info(
      "Successfully parsed statement ##{statement_id}: " \
      "#{result[:transaction_count]} transactions"
    )
  rescue StandardError => e
    Rails.logger.error(
      "Statement parser job failed for ##{statement_id}: #{e.message}\n" \
      "#{e.backtrace.first(5).join("\n")}"
    )

    statement&.mark_failed!(e.message)
    raise # Re-raise to trigger job retry
  end

  private

  def format_file_size(statement)
    return "no file" unless statement.file.attached?

    bytes = statement.file.blob.byte_size
    if bytes < 1.kilobyte
      "#{bytes} B"
    elsif bytes < 1.megabyte
      "#{(bytes / 1.kilobyte.to_f).round(1)} KB"
    else
      "#{(bytes / 1.megabyte.to_f).round(1)} MB"
    end
  end
end
