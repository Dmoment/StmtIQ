# frozen_string_literal: true

module ML
  # Automatically creates learning artifacts from high-confidence LLM categorizations
  # This enables the system to learn from LLM decisions so future similar transactions
  # can be categorized via rules/embeddings instead of calling LLM again (cheaper & faster)
  #
  # Flow:
  # 1. LLM categorizes a transaction with high confidence (>= 85%)
  # 2. LlmAutoLearnService is called
  # 3. Creates UserRule with source='llm_auto' for fast keyword matching
  # 4. Creates LabeledExample for embedding similarity
  # 5. Queues embedding generation
  #
  # This makes the system progressively smarter and cheaper over time.
  #
  class LlmAutoLearnService
    # Minimum confidence to trigger auto-learning
    MIN_CONFIDENCE_FOR_LEARNING = 0.85

    # Maximum rules to create per category to avoid spam
    MAX_RULES_PER_CATEGORY = 100

    def initialize(transaction, category:, confidence:, explanation: nil)
      @transaction = transaction
      @user = transaction.user
      @category = category
      @confidence = confidence
      @explanation = explanation
    end

    # Create learning artifacts from LLM categorization
    # Returns { learned: bool, rule: UserRule?, example: LabeledExample? }
    def learn!
      return skip_result('Confidence too low') unless should_learn?
      return skip_result('Category missing') unless @category
      return skip_result('User missing') unless @user

      result = { learned: false, rule: nil, example: nil, message: nil }

      ActiveRecord::Base.transaction do
        # 1. Create a user rule for future fast matching (user-specific)
        rule = create_auto_rule
        result[:rule] = rule

        # 2. Create a labeled example for embedding similarity (user-specific)
        example = create_labeled_example
        result[:example] = example

        # 3. Record global pattern for cross-user learning
        global_pattern = record_global_pattern
        result[:global_pattern] = global_pattern

        # 4. Queue embedding generation for the example (if not already generated)
        queue_embedding_generation(example) if example&.persisted?

        result[:learned] = rule&.persisted? || example&.persisted? || global_pattern&.persisted?
        result[:message] = build_message(rule, example, global_pattern)
      end

      log_result(result)
      result
    rescue => e
      Rails.logger.error("ML::LlmAutoLearnService: Error during auto-learn: #{e.message}")
      { learned: false, rule: nil, example: nil, message: "Error: #{e.message}" }
    end

    # Class method to learn from an LLM result
    def self.learn_from_llm_result!(transaction, llm_result)
      return nil unless llm_result && llm_result[:category]

      service = new(
        transaction,
        category: llm_result[:category],
        confidence: llm_result[:confidence],
        explanation: llm_result[:explanation]
      )
      service.learn!
    end

    private

    def should_learn?
      @confidence >= MIN_CONFIDENCE_FOR_LEARNING
    end

    def skip_result(reason)
      { learned: false, rule: nil, example: nil, message: reason }
    end

    def create_auto_rule
      # Check if we already have too many auto-rules for this category
      existing_count = UserRule.where(
        user: @user,
        category: @category,
        source: 'llm_auto'
      ).count

      if existing_count >= MAX_RULES_PER_CATEGORY
        Rails.logger.debug("ML::LlmAutoLearnService: Max rules reached for category #{@category.slug}")
        return nil
      end

      # Normalize the description to create pattern
      normalized = NormalizationService.normalize(
        @transaction.description || @transaction.original_description || ''
      )

      return nil if normalized.blank?

      # Extract meaningful pattern (first 3-4 words, avoiding noise)
      words = normalized.split(' ').reject { |w| w.length < 3 || w.match?(/^\d+$/) }
      pattern = words.first(3).join(' ')

      return nil if pattern.blank? || pattern.length < 5

      # Check for duplicate pattern
      existing_rule = UserRule.find_by(
        user: @user,
        pattern: pattern
      )
      return existing_rule if existing_rule

      # Create the rule
      UserRule.create!(
        user: @user,
        category: @category,
        pattern: pattern,
        pattern_type: 'keyword',
        match_field: 'normalized',
        source: 'llm_auto',
        source_transaction_id: @transaction.id,
        is_active: true,
        priority: -1 # Lower priority than user-created rules
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("ML::LlmAutoLearnService: Failed to create auto rule: #{e.message}")
      nil
    end

    def create_labeled_example
      normalized = NormalizationService.normalize(
        @transaction.description || @transaction.original_description || ''
      )

      return nil if normalized.blank?

      # Check for duplicate example (same normalized description)
      existing = LabeledExample.find_by(
        user: @user,
        normalized_description: normalized
      )
      return existing if existing

      LabeledExample.create!(
        user: @user,
        category: @category,
        transaction_id: @transaction.id,
        description: @transaction.description || @transaction.original_description,
        normalized_description: normalized,
        source: 'llm_auto',
        amount: @transaction.amount,
        transaction_type: @transaction.transaction_type
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("ML::LlmAutoLearnService: Failed to create labeled example: #{e.message}")
      nil
    end

    def queue_embedding_generation(example)
      return unless example
      return if example.embedding.present?

      # Queue embedding generation for labeled example
      GenerateLabeledExampleEmbeddingJob.perform_later(example.id)
    rescue => e
      Rails.logger.warn("ML::LlmAutoLearnService: Failed to queue embedding: #{e.message}")
    end

    # Record pattern globally for cross-user learning
    def record_global_pattern
      normalized = NormalizationService.normalize(
        @transaction.description || @transaction.original_description || ''
      )
      return nil if normalized.blank?

      # Extract pattern (first 3 meaningful words)
      words = normalized.split(' ').reject { |w| w.length < 3 || w.match?(/^\d+$/) }
      pattern = words.first(3).join(' ')
      return nil if pattern.blank? || pattern.length < 5

      GlobalPattern.record_pattern(
        pattern: pattern,
        category: @category,
        user: @user,
        source: 'llm_auto'
      )
    rescue => e
      Rails.logger.warn("ML::LlmAutoLearnService: Failed to record global pattern: #{e.message}")
      nil
    end

    def build_message(rule, example, global_pattern = nil)
      parts = []
      parts << "Auto-rule '#{rule.pattern}'" if rule&.persisted?
      parts << "Labeled example" if example&.persisted?
      if global_pattern&.persisted?
        status = global_pattern.is_verified? ? 'verified' : "#{global_pattern.user_count} user(s)"
        parts << "Global pattern (#{status})"
      end

      if parts.empty?
        "No artifacts created (may already exist)"
      else
        "Created: #{parts.join(' + ')}"
      end
    end

    def log_result(result)
      if result[:learned]
        Rails.logger.info(
          "ML::LlmAutoLearnService: Auto-learned from tx ##{@transaction.id} " \
          "-> #{@category.slug} (#{(@confidence * 100).round}%): #{result[:message]}"
        )
      else
        Rails.logger.debug(
          "ML::LlmAutoLearnService: Skipped tx ##{@transaction.id}: #{result[:message]}"
        )
      end
    end
  end
end
