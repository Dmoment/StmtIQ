# frozen_string_literal: true

module ML
  # Handles user feedback when they correct a category
  # This is the "learning" part of the system
  #
  # Flow:
  # 1. User corrects a category in UI
  # 2. FeedbackService is called
  # 3. Creates/updates UserRule for fast matching
  # 4. Creates LabeledExample for similarity search
  # 5. Updates the transaction
  # 6. Enqueues embedding generation
  class FeedbackService
    def initialize(transaction, user:)
      @transaction = transaction
      @user = user
    end

    # Process user feedback when they correct a category
    # Returns { success: bool, rule: UserRule?, example: LabeledExample? }
    def process_correction!(new_category, subcategory: nil)
      result = { success: false, rule: nil, example: nil, message: nil }

      ActiveRecord::Base.transaction do
        # 1. Update the transaction with user's correction
        @transaction.update!(
          category: new_category,
          subcategory: subcategory,
          is_reviewed: true,
          metadata: (@transaction.metadata || {}).merge(
            'user_corrected' => true,
            'corrected_at' => Time.current.iso8601,
            'previous_category' => @transaction.ai_category&.slug
          )
        )

        # 2. Create a user rule for future fast matching
        rule = create_user_rule(new_category, subcategory)
        result[:rule] = rule

        # 3. Create a labeled example for embedding similarity
        example = create_labeled_example(new_category, subcategory)
        result[:example] = example

        # 4. Enqueue embedding generation for the example
        example&.generate_embedding! if example&.persisted?

        result[:success] = true
        result[:message] = build_success_message(rule, example)
      end

      result
    rescue ActiveRecord::RecordInvalid => e
      result[:message] = "Failed to save feedback: #{e.message}"
      result
    rescue => e
      Rails.logger.error("ML::FeedbackService: Error processing correction: #{e.message}")
      result[:message] = "An error occurred while processing feedback"
      result
    end

    # Apply a category to multiple similar transactions
    # Useful when user wants to fix all similar transactions at once
    def apply_to_similar!(category, max_count: 50)
      similar_ids = find_similar_transaction_ids(max_count)
      return { updated: 0, ids: [] } if similar_ids.empty?

      Transaction.where(id: similar_ids).update_all(
        category_id: category.id,
        is_reviewed: false,
        updated_at: Time.current
      )

      { updated: similar_ids.count, ids: similar_ids }
    end

    private

    def create_user_rule(category, subcategory = nil)
      UserRule.create_from_feedback!(
        user: @user,
        transaction: @transaction,
        category: category,
        subcategory: subcategory
      )
    rescue => e
      Rails.logger.warn("ML::FeedbackService: Failed to create user rule: #{e.message}")
      nil
    end

    def create_labeled_example(category, subcategory = nil)
      LabeledExample.create_from_feedback!(
        user: @user,
        transaction: @transaction,
        category: category,
        subcategory: subcategory
      )
    rescue => e
      Rails.logger.warn("ML::FeedbackService: Failed to create labeled example: #{e.message}")
      nil
    end

    def find_similar_transaction_ids(max_count)
      return [] unless @transaction.embedding.present?

      # Find uncategorized transactions with similar embeddings
      sql = <<-SQL
        SELECT t.id
        FROM transactions t
        WHERE t.user_id = $1
          AND t.id != $2
          AND t.category_id IS NULL
          AND t.embedding IS NOT NULL
          AND (t.embedding <-> $3::vector) < 0.15
        ORDER BY t.embedding <-> $3::vector
        LIMIT $4
      SQL

      embedding = @transaction.embedding
      embedding_string = embedding.is_a?(Array) ? "[#{embedding.join(',')}]" : embedding

      conn = ActiveRecord::Base.connection.raw_connection
      results = conn.exec_params(sql, [@user.id, @transaction.id, embedding_string, max_count])
      results.map { |row| row['id'].to_i }
    rescue => e
      Rails.logger.warn("ML::FeedbackService: Failed to find similar transactions: #{e.message}")
      []
    end

    def build_success_message(rule, example)
      parts = []
      parts << "Created rule '#{rule.pattern}'" if rule&.persisted?
      parts << "Saved as labeled example" if example&.persisted?
      parts.empty? ? "Feedback recorded" : parts.join(' and ')
    end
  end
end
