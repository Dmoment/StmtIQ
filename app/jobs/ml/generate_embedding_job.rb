# frozen_string_literal: true

module ML
  # Generates embedding for a single transaction
  #
  # This job is queued when:
  # - A transaction is categorized but doesn't have an embedding
  # - Manual re-generation is requested
  #
  # Uses EmbeddingGenerationService for the actual work
  #
  class GenerateEmbeddingJob < ApplicationJob
    queue_as :low

    # Retry with exponential backoff for rate limits
    # Waits: 30s, 60s, 120s, 240s, 480s
    retry_on StandardError, wait: ->(executions) { (2**executions) * 30.seconds }, attempts: 5

    # Discard if transaction no longer exists
    discard_on ActiveRecord::RecordNotFound

    def perform(transaction_id)
      transaction = Transaction.find(transaction_id)

      # Skip if already has embedding
      if transaction.embedding_generated_at.present?
        Rails.logger.debug("ML::GenerateEmbeddingJob: Skipping ##{transaction_id} - already has embedding")
        return
      end

      service = ::ML::EmbeddingGenerationService.new
      embedding = service.generate_single(transaction)

      if embedding
        Rails.logger.info("ML::GenerateEmbeddingJob: Generated embedding for transaction ##{transaction_id}")
      else
        Rails.logger.warn("ML::GenerateEmbeddingJob: Failed to generate embedding for ##{transaction_id}")
      end
    rescue Faraday::TooManyRequestsError => e
      Rails.logger.warn("ML::GenerateEmbeddingJob: Rate limited for ##{transaction_id}, will retry")
      raise # Trigger retry with backoff
    end
  end
end
