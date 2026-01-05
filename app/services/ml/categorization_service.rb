# frozen_string_literal: true

module ML
  # Main orchestrator for transaction categorization
  # Implements the triage approach: Rules → Embeddings → LLM
  #
  # SOLID Principles:
  # - Single Responsibility: Orchestrates categorization flow
  # - Open/Closed: Each step (Rules, Embeddings, LLM) is pluggable
  # - Dependency Inversion: Depends on abstractions (services), not concrete implementations
  #
  # Performance Optimizations (Phase 1):
  # - Uses CategoryCache to avoid N+1 category lookups
  # - Does NOT generate embeddings inline (decoupled to EmbeddingGenerationService)
  # - Only uses existing embeddings for similarity search
  # - Queues embedding generation for transactions without embeddings
  #
  class CategorizationService
    CONFIDENCE_THRESHOLD = 0.7 # Below this, try next method
    EMBEDDING_THRESHOLD = 0.75 # Minimum similarity for embeddings
    LLM_THRESHOLD = 0.6 # Below this, use LLM

    # Result object for structured responses
    Result = Struct.new(
      :category,
      :subcategory,
      :tx_kind,
      :counterparty_name,
      :confidence,
      :method,
      :explanation,
      :needs_embedding,
      keyword_init: true
    ) do
      def success?
        category.present?
      end

      def to_h
        {
          category: category,
          subcategory: subcategory,
          tx_kind: tx_kind,
          counterparty_name: counterparty_name,
          confidence: confidence,
          method: method,
          explanation: explanation,
          needs_embedding: needs_embedding
        }
      end
    end

    def initialize(transaction, user: nil, options: {})
      @transaction = transaction
      @user = user || transaction.user
      @options = default_options.merge(options)
      @normalized_text = NormalizationService.normalize(
        transaction.description || transaction.original_description || ''
      )
      @category_cache = CategoryCache.instance
    end

    # Main categorization method
    # @return [Result]
    def categorize!
      result = nil
      needs_embedding = false

      # Mark as processing
      @transaction.mark_categorization_processing!

      # Step 1: Try rules first (fastest, free)
      result = try_rules

      # Step 2: Try embeddings if rules didn't work well
      # IMPORTANT: We only use EXISTING embeddings, never generate inline
      if @options[:enable_embeddings] && (!result || result.confidence < CONFIDENCE_THRESHOLD)
        embedding_result = try_embeddings
        if embedding_result
          result = embedding_result if !result || embedding_result.confidence > result.confidence
        else
          # No embedding exists, queue for generation
          needs_embedding = !has_embedding?
        end
      end

      # Step 3: Try LLM if still low confidence
      if @options[:enable_llm] && (!result || result.confidence < LLM_THRESHOLD)
        llm_result = try_llm
        result = llm_result if llm_result && (!result || llm_result.confidence > result.confidence)
      end

      # Update transaction and return
      save_result!(result, needs_embedding)

      # Queue embedding generation if needed
      queue_embedding_generation! if needs_embedding && @options[:queue_embeddings]

      result || Result.new(
        category: nil,
        confidence: 0.0,
        method: 'none',
        explanation: 'No categorization method succeeded',
        needs_embedding: needs_embedding
      )
    end

    # Batch categorization with optimizations
    # Uses BatchRuleEngine and BatchEmbeddingService for O(n) instead of O(n*m) complexity
    #
    # For small batches (<20), uses individual processing which is faster due to lower overhead
    # For larger batches, batch processing amortizes the setup cost
    #
    # @param transactions [Array<Transaction>]
    # @param user [User, nil]
    # @param options [Hash]
    # @return [Array<Result>]
    BATCH_THRESHOLD = 20 # Use individual processing below this size

    def self.categorize_batch(transactions, user: nil, options: {})
      return [] if transactions.empty?

      default_opts = {
        enable_embeddings: true,
        enable_llm: true,
        queue_embeddings: true,
        force_batch: false # Set true to always use batch mode
      }
      options = default_opts.merge(options)

      # For small batches, use individual processing (lower overhead)
      if transactions.size < BATCH_THRESHOLD && !options[:force_batch]
        return categorize_batch_individual(transactions, user: user, options: options)
      end

      # Pre-warm the category cache
      category_cache = CategoryCache.instance
      category_cache.refresh! if category_cache.stale?

      # Mark all as processing
      transaction_ids = transactions.map(&:id)
      Transaction.where(id: transaction_ids).update_all(categorization_status: 'processing')

      # =========================================================================
      # Phase 1: Batch rule matching (fastest, free)
      # =========================================================================
      batch_rule_engine = BatchRuleEngine.new(category_cache: category_cache)
      rule_results = batch_rule_engine.categorize_batch(transactions, user: user)

      # Track which transactions need further processing
      categorized_tx_ids = rule_results.select { |_, r| r.confidence >= CONFIDENCE_THRESHOLD }.keys
      uncategorized_txs = transactions.reject { |tx| categorized_tx_ids.include?(tx.id) }

      Rails.logger.info(
        "ML::CategorizationService.categorize_batch: Rules matched #{categorized_tx_ids.size}/#{transactions.size}"
      )

      # =========================================================================
      # Phase 2: Batch embedding similarity (for uncategorized transactions)
      # =========================================================================
      embedding_results = {}
      if options[:enable_embeddings] && uncategorized_txs.any?
        batch_embedding_service = BatchEmbeddingService.new(category_cache: category_cache)
        embedding_results = batch_embedding_service.find_similar_batch(
          uncategorized_txs,
          user: user || transactions.first&.user
        )

        # Update categorized set
        newly_categorized = embedding_results.select { |_, r| r.confidence >= EMBEDDING_THRESHOLD }.keys
        categorized_tx_ids.concat(newly_categorized)
        uncategorized_txs = uncategorized_txs.reject { |tx| categorized_tx_ids.include?(tx.id) }

        Rails.logger.info(
          "ML::CategorizationService.categorize_batch: Embeddings matched #{newly_categorized.size} more"
        )
      end

      # =========================================================================
      # Phase 3: LLM fallback (for remaining uncategorized - expensive)
      # =========================================================================
      llm_results = {}
      auto_learned_count = 0
      if options[:enable_llm] && uncategorized_txs.any? && ENV['OPENAI_API_KEY'].present?
        enable_auto_learn = options.fetch(:enable_llm_auto_learn, true)

        # LLM is still processed individually (batching LLM calls is complex)
        uncategorized_txs.each do |tx|
          begin
            llm_result = LlmService.new(tx, category_cache: category_cache).categorize
            if llm_result && llm_result[:category]
              llm_results[tx.id] = Result.new(
                category: llm_result[:category],
                confidence: llm_result[:confidence],
                method: llm_result[:method],
                explanation: llm_result[:explanation],
                needs_embedding: false
              )

              # Auto-learn from high-confidence LLM categorizations
              if enable_auto_learn
                learn_result = LlmAutoLearnService.learn_from_llm_result!(tx, llm_result)
                auto_learned_count += 1 if learn_result&.dig(:learned)
              end
            end
          rescue => e
            Rails.logger.warn("ML::CategorizationService: LLM failed for tx #{tx.id}: #{e.message}")
          end
        end

        Rails.logger.info(
          "ML::CategorizationService.categorize_batch: LLM matched #{llm_results.size} more, " \
          "auto-learned #{auto_learned_count}"
        )
      end

      # =========================================================================
      # Save results and collect transactions needing embeddings
      # =========================================================================
      needs_embedding_ids = []
      final_results = []

      transactions.each do |tx|
        # Determine best result from all sources
        rule_result = rule_results[tx.id]
        embedding_result = embedding_results[tx.id]
        llm_result = llm_results[tx.id]

        # Convert batch results to Result objects
        result = pick_best_result(rule_result, embedding_result, llm_result, tx.id)

        # Check if needs embedding
        if !tx.embedding_generated_at && !result&.success?
          needs_embedding_ids << tx.id
        end

        # Save to database
        save_batch_result!(tx, result, needs_embedding: needs_embedding_ids.include?(tx.id))

        final_results << (result || Result.new(
          category: nil,
          confidence: 0.0,
          method: 'none',
          explanation: 'No categorization method succeeded',
          needs_embedding: needs_embedding_ids.include?(tx.id)
        ))
      end

      # Queue embedding generation for all transactions that need it
      if needs_embedding_ids.any? && options[:queue_embeddings]
        ::ML::GenerateEmbeddingsBatchJob.perform_later(needs_embedding_ids)
      end

      Rails.logger.info(
        "ML::CategorizationService.categorize_batch: Complete. " \
        "#{final_results.count(&:success?)}/#{transactions.size} categorized, " \
        "#{needs_embedding_ids.size} queued for embeddings"
      )

      final_results
    end

    # Helper to pick the best result from multiple sources
    def self.pick_best_result(rule_result, embedding_result, llm_result, tx_id)
      candidates = []

      if rule_result
        candidates << Result.new(
          category: rule_result.category,
          subcategory: rule_result.subcategory,
          tx_kind: rule_result.tx_kind,
          counterparty_name: rule_result.counterparty_name,
          confidence: rule_result.confidence,
          method: rule_result.method,
          explanation: rule_result.explanation,
          needs_embedding: false
        )
      end

      if embedding_result
        candidates << Result.new(
          category: embedding_result.category,
          subcategory: embedding_result.subcategory,
          tx_kind: embedding_result.tx_kind,
          counterparty_name: embedding_result.counterparty_name,
          confidence: embedding_result.confidence,
          method: embedding_result.method,
          explanation: embedding_result.explanation,
          needs_embedding: false
        )
      end

      if llm_result
        candidates << llm_result
      end

      return nil if candidates.empty?

      # Return highest confidence result
      candidates.max_by(&:confidence)
    end

    # Save a batch result to database
    def self.save_batch_result!(transaction, result, needs_embedding: false)
      normalized_text = NormalizationService.normalize(
        transaction.description || transaction.original_description || ''
      )

      if result&.success?
        transaction.update!(
          ai_category: result.category,
          subcategory: result.subcategory,
          tx_kind: result.tx_kind,
          counterparty_name: result.counterparty_name,
          confidence: result.confidence,
          ai_explanation: result.explanation,
          categorization_status: 'completed',
          metadata: (transaction.metadata || {}).merge(
            'categorization_method' => result.method,
            'normalized_description' => normalized_text,
            'needs_embedding' => needs_embedding
          )
        )
      else
        transaction.update_column(:categorization_status, 'completed')
      end
    end
    # Individual processing for small batches (faster due to less overhead)
    def self.categorize_batch_individual(transactions, user: nil, options: {})
      category_cache = CategoryCache.instance
      category_cache.refresh! if category_cache.stale?

      needs_embedding_ids = []
      results = []

      transactions.each do |tx|
        service = new(tx, user: user || tx.user, options: options.merge(queue_embeddings: false))
        result = service.categorize!

        needs_embedding_ids << tx.id if result.needs_embedding
        results << result
      end

      # Queue embedding generation in one batch
      if needs_embedding_ids.any? && options.fetch(:queue_embeddings, true)
        ::ML::GenerateEmbeddingsBatchJob.perform_later(needs_embedding_ids)
      end

      results
    end

    private_class_method :pick_best_result, :save_batch_result!, :categorize_batch_individual

    private

    def default_options
      {
        enable_embeddings: true,
        enable_llm: true,
        queue_embeddings: true
      }
    end

    # =========================================================================
    # Step 1: Rule-based categorization
    # =========================================================================
    def try_rules
      rule_result = RuleEngine.new(@transaction, user: @user, category_cache: @category_cache).categorize

      if rule_result[:confidence] >= CONFIDENCE_THRESHOLD
        log_step(:rules, :success, rule_result[:confidence])
        Result.new(
          category: rule_result[:category],
          subcategory: rule_result[:subcategory],
          tx_kind: rule_result[:tx_kind],
          counterparty_name: rule_result[:counterparty_name],
          confidence: rule_result[:confidence],
          method: rule_result[:method],
          explanation: rule_result[:explanation],
          needs_embedding: false
        )
      else
        log_step(:rules, :low_confidence, rule_result[:confidence])
        nil
      end
    end

    # =========================================================================
    # Step 2: Embedding-based categorization (uses existing embeddings only)
    # =========================================================================
    def try_embeddings
      return nil unless @options[:enable_embeddings]

      # Only use existing embeddings, never generate inline
      embedding_result = EmbeddingService.new(
        @transaction,
        normalized_text: @normalized_text,
        skip_generation: true, # IMPORTANT: Never generate inline
        category_cache: @category_cache
      ).categorize

      return nil unless embedding_result && embedding_result[:confidence] >= EMBEDDING_THRESHOLD

      log_step(:embeddings, :success, embedding_result[:confidence])
      Result.new(
        category: embedding_result[:category],
        subcategory: embedding_result[:subcategory],
        tx_kind: embedding_result[:tx_kind],
        counterparty_name: embedding_result[:counterparty_name],
        confidence: embedding_result[:confidence],
        method: embedding_result[:method],
        explanation: embedding_result[:explanation],
        needs_embedding: false
      )
    rescue StandardError => e
      log_step(:embeddings, :error, 0, e.message)
      nil
    end

    # =========================================================================
    # Step 3: LLM-based categorization
    # =========================================================================
    def try_llm
      return nil unless @options[:enable_llm]
      return nil unless ENV['OPENAI_API_KEY'].present?

      log_step(:llm, :trying)

      llm_result = ::ML::LlmService.new(
        @transaction,
        normalized_text: @normalized_text,
        category_cache: @category_cache
      ).categorize

      return nil unless llm_result && llm_result[:category]

      log_step(:llm, :success, llm_result[:confidence])

      # Auto-learn from high-confidence LLM categorizations
      # This creates UserRules and LabeledExamples so future similar
      # transactions can be categorized without calling LLM again
      if @options.fetch(:enable_llm_auto_learn, true)
        LlmAutoLearnService.learn_from_llm_result!(@transaction, llm_result)
      end

      Result.new(
        category: llm_result[:category],
        subcategory: llm_result[:subcategory],
        tx_kind: llm_result[:tx_kind],
        counterparty_name: llm_result[:counterparty_name],
        confidence: llm_result[:confidence],
        method: llm_result[:method],
        explanation: llm_result[:explanation],
        needs_embedding: false
      )
    rescue StandardError => e
      log_step(:llm, :error, 0, e.message)
      nil
    end

    # =========================================================================
    # Persistence
    # =========================================================================
    def save_result!(result, needs_embedding)
      if result&.success?
        @transaction.update!(
          ai_category: result.category,
          subcategory: result.subcategory,
          tx_kind: result.tx_kind,
          counterparty_name: result.counterparty_name,
          confidence: result.confidence,
          ai_explanation: result.explanation,
          categorization_status: 'completed',
          metadata: (@transaction.metadata || {}).merge(
            'categorization_method' => result.method,
            'normalized_description' => @normalized_text,
            'needs_embedding' => needs_embedding
          )
        )
        log_final(:success, result)
      else
        @transaction.update_column(:categorization_status, 'completed')
        log_final(:no_category, result)
      end
    end

    def has_embedding?
      @transaction.embedding_generated_at.present?
    end

    def queue_embedding_generation!
      ::ML::GenerateEmbeddingJob.perform_later(@transaction.id)
    end

    # =========================================================================
    # Logging
    # =========================================================================
    def log_step(step, status, confidence = nil, error = nil)
      msg = "ML::CategorizationService [##{@transaction.id}]: #{step.upcase}"
      case status
      when :success
        Rails.logger.info("#{msg} matched with #{(confidence * 100).round}% confidence")
      when :low_confidence
        Rails.logger.debug("#{msg} low confidence (#{(confidence * 100).round}%), trying next...")
      when :trying
        Rails.logger.debug("#{msg} attempting...")
      when :error
        Rails.logger.warn("#{msg} failed: #{error}")
      end
    end

    def log_final(status, result)
      case status
      when :success
        Rails.logger.info(
          "ML::CategorizationService [##{@transaction.id}]: " \
          "Categorized as #{result.category.slug} via #{result.method} " \
          "(#{(result.confidence * 100).round}%)"
        )
      when :no_category
        Rails.logger.info(
          "ML::CategorizationService [##{@transaction.id}]: " \
          "No category found - #{result&.explanation || 'No result'}"
        )
      end
    end
  end
end
