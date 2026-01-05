# frozen_string_literal: true

module ML
  # Generates embeddings for a batch of transactions
  #
  # This is more efficient than individual jobs because:
  # - OpenAI's embedding API supports batch requests
  # - Reduces API overhead
  # - Better rate limit handling
  #
  # Usage:
  #   ML::GenerateEmbeddingsBatchJob.perform_later([1, 2, 3, 4, 5])
  #
  class GenerateEmbeddingsBatchJob < ApplicationJob
    queue_as :low

    # Retry with exponential backoff
    retry_on StandardError, wait: ->(executions) { (2**executions) * 30.seconds }, attempts: 3

    # Limit to one batch job at a time to avoid rate limits
    # Using unique job feature if available
    if respond_to?(:unique)
      unique :until_executed
    end

    def perform(transaction_ids, user_id: nil)
      return if transaction_ids.blank?

      Rails.logger.info("ML::GenerateEmbeddingsBatchJob: Starting batch for #{transaction_ids.size} transactions")

      service = ::ML::EmbeddingGenerationService.new(
        user_id: user_id,
        batch_size: 50
      )

      # Only process transactions that don't have embeddings yet
      ids_needing_embeddings = Transaction
        .where(id: transaction_ids, embedding_generated_at: nil)
        .pluck(:id)

      if ids_needing_embeddings.empty?
        Rails.logger.info("ML::GenerateEmbeddingsBatchJob: All transactions already have embeddings")
        return
      end

      # Generate embeddings in batches
      result = service.generate_batch(limit: ids_needing_embeddings.size)

      Rails.logger.info(
        "ML::GenerateEmbeddingsBatchJob: Completed. " \
        "Generated: #{result.generated_count}, Failed: #{result.failed_count}, " \
        "Duration: #{result.duration.round(2)}s"
      )

      if result.errors.any?
        Rails.logger.warn("ML::GenerateEmbeddingsBatchJob: Errors: #{result.errors.join(', ')}")
      end
    rescue Faraday::TooManyRequestsError => e
      Rails.logger.warn("ML::GenerateEmbeddingsBatchJob: Rate limited, will retry")
      raise # Trigger retry
    end
  end
end
