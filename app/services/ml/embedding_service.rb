# frozen_string_literal: true

module ML
  # Embedding-based categorization using vector similarity
  # Uses pgvector for nearest neighbor search
  class EmbeddingService
    MIN_SIMILARITY = 0.75 # Minimum cosine similarity (1 - distance)
    MAX_RESULTS = 5 # Number of similar transactions to consider
    EMBEDDING_MODEL = 'text-embedding-3-small' # OpenAI model (1536 dimensions, cheaper)

    # @param transaction [Transaction]
    # @param normalized_text [String, nil] Pre-computed normalized text
    # @param skip_generation [Boolean] If true, only use existing embeddings
    # @param category_cache [ML::CategoryCache, nil] Optional cache for category lookups
    def initialize(transaction, normalized_text: nil, skip_generation: false, category_cache: nil)
      @transaction = transaction
      @normalized_text = normalized_text || NormalizationService.normalize(
        transaction.description || transaction.original_description || ''
      )
      @skip_generation = skip_generation # Skip API calls during batch processing
      @category_cache = category_cache || CategoryCache.instance
    end

    def categorize
      return nil if @normalized_text.blank?
      return nil unless openai_configured?

      # Get existing embedding or generate new one (unless skipping)
      embedding = @skip_generation ? get_existing_embedding : get_or_generate_embedding
      return nil unless embedding

      # Find similar labeled examples first (user feedback - highest priority)
      similar_examples = find_similar_labeled_examples(embedding)
      if similar_examples.any?
        result = determine_category_from_examples(similar_examples)
        return result if result && result[:confidence] >= MIN_SIMILARITY
      end

      # Fall back to similar transactions
      similar_transactions = find_similar_transactions(embedding)
      return nil if similar_transactions.empty?

      # Determine category from similar transactions
      determine_category_from_similar(similar_transactions)
    end

    def generate_and_store_embedding
      return nil if @normalized_text.blank?
      return nil unless openai_configured?

      # Check if embedding already exists
      result = ActiveRecord::Base.connection.execute(
        "SELECT embedding FROM transactions WHERE id = #{@transaction.id}"
      ).first
      existing = parse_embedding(result['embedding']) if result && result['embedding'].present?
      return existing if existing

      embedding_vector = generate_embedding(@normalized_text)
      return nil unless embedding_vector

      # Store embedding in database
      # Convert array to vector format string for PostgreSQL
      embedding_string = "[#{embedding_vector.join(',')}]"
      # Use raw SQL with proper escaping (pgvector requires direct SQL)
      ActiveRecord::Base.connection.execute(
        "UPDATE transactions SET embedding = '#{embedding_string.gsub("'", "''")}'::vector WHERE id = #{@transaction.id}"
      )
      embedding_vector
    end

    private

    def get_existing_embedding
      # Only return existing embedding, don't generate new one
      result = ActiveRecord::Base.connection.execute(
        "SELECT embedding FROM transactions WHERE id = #{@transaction.id}"
      ).first

      if result && result['embedding'].present?
        return parse_embedding(result['embedding'])
      end

      nil
    end

    def get_or_generate_embedding
      # Check if embedding exists in database
      result = ActiveRecord::Base.connection.execute(
        "SELECT embedding FROM transactions WHERE id = #{@transaction.id}"
      ).first

      if result && result['embedding'].present?
        return parse_embedding(result['embedding'])
      end

      generate_and_store_embedding
    end

    def generate_embedding(text, retries: 0)
      return nil if text.blank?
      return nil unless openai_configured?

      begin
        client = OpenAI::Client.new(access_token: openai_api_key)
        response = client.embeddings(
          parameters: {
            model: EMBEDDING_MODEL,
            input: text
          }
        )

        embedding_data = response.dig('data', 0, 'embedding')
        return nil unless embedding_data

        # Return as array - ActiveRecord will handle conversion to vector format
        embedding_data
      rescue => e
        # Don't retry here - let the job handle retries to avoid blocking
        # This prevents connection pool exhaustion
        if e.message.include?('429')
          Rails.logger.warn("ML::EmbeddingService: Rate limited, letting job retry")
          raise # Re-raise for job to handle
        end

        Rails.logger.error("ML::EmbeddingService: Failed to generate embedding: #{e.message}")
        nil
      end
    end

    def find_similar_transactions(embedding)
      # Use pgvector cosine distance (<->) to find similar transactions
      # We only consider transactions that:
      # 1. Belong to the same user (for privacy/context)
      # 2. Have a category (either manual or AI)
      # 3. Have an embedding
      # 4. Are similar enough (cosine distance < threshold)

      distance_threshold = 1.0 - MIN_SIMILARITY # Convert similarity to distance

      sql = <<-SQL
        SELECT
          t.id,
          t.category_id,
          t.ai_category_id,
          t.description,
          1 - (t.embedding <-> $1::vector) as similarity
        FROM transactions t
        WHERE t.user_id = $2
          AND t.id != $3
          AND t.embedding IS NOT NULL
          AND (t.category_id IS NOT NULL OR t.ai_category_id IS NOT NULL)
          AND (t.embedding <-> $1::vector) < $4
        ORDER BY t.embedding <-> $1::vector
        LIMIT $5
      SQL

      # Convert embedding to array format
      embedding_array = embedding.is_a?(Array) ? embedding : parse_embedding(embedding) || []
      return [] if embedding_array.empty?

      # Convert to PostgreSQL vector format string: "[0.1,0.2,...]"
      embedding_string = "[#{embedding_array.join(',')}]"

      # Use raw connection for parameterized query with pgvector
      conn = ActiveRecord::Base.connection.raw_connection
      results = conn.exec_params(
        sql,
        [embedding_string, @transaction.user_id, @transaction.id, distance_threshold, MAX_RESULTS]
      )

      results.map do |row|
        {
          id: row['id'].to_i,
          category_id: (row['category_id'] || row['ai_category_id'])&.to_i,
          similarity: row['similarity'].to_f,
          description: row['description']
        }
      end
    end

    def find_similar_labeled_examples(embedding)
      # Search labeled examples (user feedback) for similar patterns
      distance_threshold = 1.0 - MIN_SIMILARITY

      sql = <<-SQL
        SELECT
          le.id,
          le.category_id,
          le.normalized_description,
          1 - (le.embedding <-> $1::vector) as similarity
        FROM labeled_examples le
        WHERE le.user_id = $2
          AND le.embedding IS NOT NULL
          AND (le.embedding <-> $1::vector) < $3
        ORDER BY le.embedding <-> $1::vector
        LIMIT $4
      SQL

      embedding_array = embedding.is_a?(Array) ? embedding : parse_embedding(embedding) || []
      return [] if embedding_array.empty?

      embedding_string = "[#{embedding_array.join(',')}]"

      conn = ActiveRecord::Base.connection.raw_connection
      results = conn.exec_params(
        sql,
        [embedding_string, @transaction.user_id, distance_threshold, MAX_RESULTS]
      )

      results.map do |row|
        {
          id: row['id'].to_i,
          category_id: row['category_id'].to_i,
          similarity: row['similarity'].to_f,
          description: row['normalized_description']
        }
      end
    rescue => e
      Rails.logger.warn("ML::EmbeddingService: Failed to find similar labeled examples: #{e.message}")
      []
    end

    def determine_category_from_examples(similar_examples)
      return nil if similar_examples.empty?

      # Group by category and calculate confidence
      category_scores = similar_examples.group_by { |ex| ex[:category_id] }.map do |category_id, examples|
        avg_similarity = examples.sum { |ex| ex[:similarity] } / examples.size.to_f
        count = examples.size

        {
          category_id: category_id,
          avg_similarity: avg_similarity,
          count: count,
          # Labeled examples get higher weight than regular transactions
          score: avg_similarity * (1 + Math.log(count + 1) / 8)
        }
      end

      best_match = category_scores.max_by { |cs| cs[:score] }
      return nil unless best_match
      return nil unless best_match[:avg_similarity] >= MIN_SIMILARITY

      # Use cache instead of DB query
      category = @category_cache.find_by_id(best_match[:category_id])
      return nil unless category

      # Higher confidence for labeled examples (user-verified)
      confidence = [
        best_match[:avg_similarity] * 0.95 + (best_match[:count] * 0.02),
        0.98
      ].min

      {
        category: category,
        confidence: confidence,
        method: 'embedding_feedback',
        explanation: "Matched #{best_match[:count]} user-labeled example(s) with #{format('%.1f', best_match[:avg_similarity] * 100)}% similarity"
      }
    end

    def determine_category_from_similar(similar_transactions)
      # Group by category and calculate weighted average similarity
      category_scores = similar_transactions.group_by { |tx| tx[:category_id] }.map do |category_id, txs|
        avg_similarity = txs.sum { |tx| tx[:similarity] } / txs.size.to_f
        count = txs.size

        {
          category_id: category_id,
          avg_similarity: avg_similarity,
          count: count,
          score: avg_similarity * (1 + Math.log(count + 1) / 10) # Boost for multiple matches
        }
      end

      # Get the best category
      best_match = category_scores.max_by { |cs| cs[:score] }
      return nil unless best_match
      return nil unless best_match[:avg_similarity] >= MIN_SIMILARITY

      # Use cache instead of DB query
      category = @category_cache.find_by_id(best_match[:category_id])
      return nil unless category

      # Confidence is based on similarity and number of matches
      confidence = [
        best_match[:avg_similarity] * 0.9 + (best_match[:count] * 0.02),
        0.95
      ].min

      {
        category: category,
        confidence: confidence,
        method: 'embedding',
        explanation: "Matched #{best_match[:count]} similar transaction(s) with #{format('%.1f', best_match[:avg_similarity] * 100)}% similarity"
      }
    end

    def parse_embedding(embedding_value)
      return nil unless embedding_value

      if embedding_value.is_a?(String)
        # Parse vector string "[0.1,0.2,...]" to array
        embedding_value.gsub(/[\[\]]/, '').split(',').map(&:to_f)
      elsif embedding_value.is_a?(Array)
        embedding_value
      else
        nil
      end
    end

    def openai_configured?
      openai_api_key.present?
    end

    def openai_api_key
      ENV['OPENAI_API_KEY']
    end
  end
end
