# frozen_string_literal: true

class AICategorizeJob < ApplicationJob
  queue_as :low

  def perform(transaction_ids)
    transactions = Transaction.where(id: transaction_ids)

    Rails.logger.info("Categorizing #{transactions.count} transactions")

    transactions.find_each do |transaction|
      next if transaction.category_id.present? # Skip already categorized

      begin
        AICategorizer.new(transaction).categorize!
      rescue StandardError => e
        Rails.logger.error("Failed to categorize transaction ##{transaction.id}: #{e.message}")
      end
    end

    Rails.logger.info("Finished categorizing transactions")
  end
end
