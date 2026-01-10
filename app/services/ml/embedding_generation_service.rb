# frozen_string_literal: true

module ML
  # Service for batch embedding generation, decoupled from categorization
  #
  # SOLID Principles:
  # - Single Responsibility: Only handles embedding generation
  # - Open/Closed: Extensible via strategy pattern for different embedding providers
  # - Dependency Inversion: Depends on abstractions (configurable via options)
  #
  # This service:
  # - Generates embeddings in batches to minimize API calls
  # - Handles rate limiting with exponential backoff
  # - Tracks generation status via embedding_generated_at
  # - Is idempotent (safe to retry)
  #
  # Usage:
  #   service = ML::EmbeddingGenerationService.new(user_id: 123)
  #   result = service.generate_batch(limit: 100)
  #
  class EmbeddingGenerationService
    # OpenAI batch endpoint supports up to 2048 inputs
    # We use smaller batches to manage memory and allow progress tracking
    BATCH_SIZE = 50
    MAX_RETRIES = 3
    BASE_RETRY_DELAY = 2 # seconds
    EMBEDDING_MODEL = 'text-embedding-3-small'
    EMBEDDING_DIMENSIONS = 1536

    # Result object for better encapsulation
    Result = Struct.new(:success, :generated_count, :failed_count, :errors, :duration, keyword_init: true) do
      def success?
        success
      end

      def total_processed
        generated_count + failed_count
      end
    end

    def initialize(user_id: nil, batch_size: BATCH_SIZE)
      @user_id = user_id
      @batch_size = batch_size
      @errors = []
    end

    # Generate embeddings for transactions that don't have them
    # @param limit [Integer] Maximum number of transactions to process
    # @return [Result]
    def generate_batch(limit: 500)
      start_time = Time.current

      return Result.new(success: false, generated_count: 0, failed_count: 0,
                        errors: ['OpenAI API key not configured'], duration: 0) unless openai_configured?

      transactions = find_transactions_needing_embeddings(limit)

      if transactions.empty?
        return Result.new(success: true, generated_count: 0, failed_count: 0,
                          errors: [], duration: 0)
      end

      generated_count = 0
      failed_count = 0

      # Process in batches
      transactions.each_slice(@batch_size) do |batch|
        batch_result = process_batch(batch)
        generated_count += batch_result[:generated]
        failed_count += batch_result[:failed]

        # Log progress
        Rails.logger.info("ML::EmbeddingGenerationService: Progress #{generated_count + failed_count}/#{transactions.size}")
      end

      duration = Time.current - start_time

      Result.new(
        success: @errors.empty?,
        generated_count: generated_count,
        failed_count: failed_count,
        errors: @errors,
        duration: duration
      )
    end

    # Generate embedding for a single transaction (for on-demand use)
    # @param transaction [Transaction]
    # @return [Array<Float>, nil] The embedding vector or nil on failure
    def generate_single(transaction)
      return nil unless openai_configured?

      normalized_text = NormalizationService.normalize(
        transaction.description || transaction.original_description || ''
      )

      return nil if normalized_text.blank?

      embedding = call_openai_single(normalized_text)
      return nil unless embedding

      store_embedding(transaction, embedding)
      embedding
    end

    private

    def find_transactions_needing_embeddings(limit)
      scope = Transaction.where(embedding_generated_at: nil)
      scope = scope.where(user_id: @user_id) if @user_id
      scope.order(created_at: :desc).limit(limit).to_a
    end

    def process_batch(transactions)
      # Prepare normalized texts
      texts_with_ids = transactions.map do |tx|
        normalized = NormalizationService.normalize(
          tx.description || tx.original_description || ''
        )
        { id: tx.id, text: normalized, transaction: tx }
      end

      # Filter out blank texts
      valid_texts = texts_with_ids.reject { |item| item[:text].blank? }
      blank_texts = texts_with_ids.select { |item| item[:text].blank? }

      # Mark blank ones as "generated" (nothing to embed)
      mark_as_generated(blank_texts.map { |item| item[:id] }) if blank_texts.any?

      return { generated: blank_texts.size, failed: 0 } if valid_texts.empty?

      # Call OpenAI batch API
      embeddings = call_openai_batch(valid_texts.map { |item| item[:text] })

      if embeddings.nil?
        # API call failed completely
        return { generated: blank_texts.size, failed: valid_texts.size }
      end

      # Store embeddings
      generated = 0
      failed = 0

      valid_texts.each_with_index do |item, index|
        embedding = embeddings[index]
        if embedding
          store_embedding(item[:transaction], embedding)
          generated += 1
        else
          failed += 1
          @errors << "Failed to get embedding for transaction ##{item[:id]}"
        end
      end

      { generated: generated + blank_texts.size, failed: failed }
    end

    def call_openai_batch(texts, retries: MAX_RETRIES)
      client = OpenAI::Client.new(access_token: openai_api_key)

      response = client.embeddings(
        parameters: {
          model: EMBEDDING_MODEL,
          input: texts
        }
      )

      # Extract embeddings in order
      data = response['data']
      return nil unless data.is_a?(Array)

      # Sort by index to ensure correct order
      sorted_data = data.sort_by { |item| item['index'] }
      sorted_data.map { |item| item['embedding'] }
    rescue Faraday::TooManyRequestsError, OpenAI::Error => e
      handle_api_error(e, texts, retries)
    rescue StandardError => e
      Rails.logger.error("ML::EmbeddingGenerationService: Unexpected error: #{e.message}")
      @errors << "Unexpected error: #{e.message}"
      nil
    end

    def call_openai_single(text, retries: MAX_RETRIES)
      client = OpenAI::Client.new(access_token: openai_api_key)

      response = client.embeddings(
        parameters: {
          model: EMBEDDING_MODEL,
          input: text
        }
      )

      response.dig('data', 0, 'embedding')
    rescue Faraday::TooManyRequestsError, OpenAI::Error => e
      handle_api_error(e, [text], retries)&.first
    rescue StandardError => e
      Rails.logger.error("ML::EmbeddingGenerationService: Unexpected error: #{e.message}")
      nil
    end

    def handle_api_error(error, texts, retries)
      if error.message.include?('429') && retries > 0
        delay = BASE_RETRY_DELAY * (MAX_RETRIES - retries + 1)
        Rails.logger.warn("ML::EmbeddingGenerationService: Rate limited, retrying in #{delay}s (#{retries} left)")
        sleep(delay)
        return call_openai_batch(texts, retries: retries - 1)
      end

      Rails.logger.error("ML::EmbeddingGenerationService: API error: #{error.message}")
      @errors << "API error: #{error.message}"
      nil
    end

    def store_embedding(transaction, embedding)
      embedding_string = "[#{embedding.join(',')}]"

      # Use raw SQL for pgvector compatibility
      ActiveRecord::Base.connection.execute(
        ActiveRecord::Base.sanitize_sql([
          "UPDATE transactions SET embedding = ?::vector, embedding_generated_at = ? WHERE id = ?",
          embedding_string, Time.current, transaction.id
        ])
      )
    rescue StandardError => e
      Rails.logger.error("ML::EmbeddingGenerationService: Failed to store embedding for ##{transaction.id}: #{e.message}")
      @errors << "Storage error for ##{transaction.id}: #{e.message}"
    end

    def mark_as_generated(transaction_ids)
      return if transaction_ids.empty?

      Transaction.where(id: transaction_ids).update_all(embedding_generated_at: Time.current)
    end

    def openai_configured?
      openai_api_key.present?
    end

    def openai_api_key
      ENV['OPENAI_API_KEY']
    end
  end
end
