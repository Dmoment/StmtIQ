# frozen_string_literal: true

module ML
  # Categorizes a batch of transactions efficiently
  #
  # Uses optimized batch processing:
  # - Pre-warms category cache
  # - Uses batch categorization method
  # - Queues embedding generation for transactions that need it
  #
  class CategorizeBatchJob < ApplicationJob
    queue_as :default

    BATCH_SIZE = 100

    def perform(transaction_ids, user_id: nil)
      return if transaction_ids.blank?

      Rails.logger.info("ML::CategorizeBatchJob: Starting categorization for #{transaction_ids.count} transactions")

      user = user_id ? User.find_by(id: user_id) : nil

      # Pre-warm category cache before processing
      ::ML::CategoryCache.instance.refresh!

      categorized_count = 0
      failed_count = 0
      needs_embedding_ids = []

      # Process in batches to manage memory
      transaction_ids.each_slice(BATCH_SIZE) do |batch_ids|
        transactions = Transaction.where(id: batch_ids).to_a

        begin
          # Use batch categorization (more efficient)
          results = ::ML::CategorizationService.categorize_batch(
            transactions,
            user: user,
            options: {
              enable_embeddings: true,
              enable_llm: true,
              queue_embeddings: false # We'll queue after all batches
            }
          )

          results.each_with_index do |result, index|
            if result.success?
              categorized_count += 1
            end
            needs_embedding_ids << transactions[index].id if result.needs_embedding
          end
        rescue StandardError => e
          failed_count += transactions.size
          Rails.logger.error("ML::CategorizeBatchJob: Batch failed: #{e.message}")
          Rails.logger.error(e.backtrace.first(5).join("\n"))
        end
      end

      # Queue embedding generation for all transactions that need it
      if needs_embedding_ids.any?
        Rails.logger.info("ML::CategorizeBatchJob: Queueing embedding generation for #{needs_embedding_ids.size} transactions")
        ::ML::GenerateEmbeddingsBatchJob.perform_later(needs_embedding_ids, user_id: user_id)
      end

      Rails.logger.info(
        "ML::CategorizeBatchJob: Completed. " \
        "Categorized: #{categorized_count}, " \
        "Failed: #{failed_count}, " \
        "Needs embeddings: #{needs_embedding_ids.size}"
      )
    end
  end
end
