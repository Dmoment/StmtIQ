# frozen_string_literal: true

class StatementParserJob < ApplicationJob
  queue_as :default

  def perform(statement_id)
    statement = Statement.find(statement_id)

    Rails.logger.info("Starting to parse statement ##{statement_id}")

    parser = StatementParser.new(statement)
    result = parser.parse!

    if result[:success]
      Rails.logger.info("Successfully parsed statement ##{statement_id}: #{result[:count]} transactions")

      # Auto-categorize transactions
      AICategorizeJob.perform_later(statement.transactions.pluck(:id))
    else
      Rails.logger.error("Failed to parse statement ##{statement_id}: #{result[:error]}")
    end
  rescue StandardError => e
    Rails.logger.error("Statement parser job failed: #{e.message}\n#{e.backtrace.first(5).join("\n")}")

    statement&.mark_failed!(e.message)
    raise # Re-raise to trigger job retry
  end
end
