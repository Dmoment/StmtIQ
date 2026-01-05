# frozen_string_literal: true

module ML
  # Optimized batch rule matching using an inverted keyword index
  # Instead of iterating O(n × m) where n=transactions, m=keywords,
  # we build an index once and match in O(n × k) where k=avg words per description
  #
  # Performance: 10-50x faster for batches of 100+ transactions
  #
  class BatchRuleEngine
    # Result object for batch results (includes subcategory support)
    BatchResult = Struct.new(
      :transaction_id,
      :category,
      :subcategory,
      :tx_kind,
      :counterparty_name,
      :confidence,
      :method,
      :explanation,
      keyword_init: true
    )

    def initialize(category_cache: nil, subcategory_cache: nil)
      @category_cache = category_cache || CategoryCache.instance
      @subcategory_cache = subcategory_cache || SubcategoryCache.instance
      @keyword_index = nil
      @user_rules_index = nil
    end

    # Categorize multiple transactions efficiently
    # @param transactions [Array<Transaction>]
    # @param user [User, nil] Optional user for user-specific rules
    # @return [Hash<Integer, BatchResult>] Map of transaction_id => result
    def categorize_batch(transactions, user: nil)
      return {} if transactions.empty?

      # Build indices once for all transactions
      build_keyword_index!
      build_user_rules_index!(user) if user

      # Process all transactions against the index
      results = {}

      transactions.each do |tx|
        normalized_text = NormalizationService.normalize(
          tx.description || tx.original_description || ''
        )

        result = match_transaction(tx, normalized_text, user: user)
        results[tx.id] = result if result
      end

      results
    end

    private

    # Build inverted index: keyword → { category_slug, weight }
    def build_keyword_index!
      return if @keyword_index

      @keyword_index = {}

      RuleEngine::SYSTEM_RULES.each do |category_slug, keywords|
        keywords.each do |keyword|
          kw = keyword.downcase.strip
          weight = kw.split(' ').length > 1 ? 3 : 2 # Multi-word matches are stronger

          # Index by first word for fast lookup
          first_word = kw.split(' ').first
          @keyword_index[first_word] ||= []
          @keyword_index[first_word] << {
            keyword: kw,
            category_slug: category_slug,
            weight: weight,
            pattern: /\b#{Regexp.escape(kw)}\b/
          }
        end
      end

      # Also index exact single-word keywords for O(1) lookup
      @exact_keywords = {}
      RuleEngine::SYSTEM_RULES.each do |category_slug, keywords|
        keywords.each do |keyword|
          kw = keyword.downcase.strip
          next if kw.include?(' ') # Skip multi-word

          @exact_keywords[kw] ||= []
          @exact_keywords[kw] << {
            category_slug: category_slug,
            weight: 2
          }
        end
      end
    end

    # Build index for user-specific rules
    def build_user_rules_index!(user)
      return unless user

      @user_rules_index = {}
      @user_rules_list = []

      user_rules = UserRule.for_user(user).includes(:category)
      user_rules.each do |rule|
        @user_rules_list << {
          rule: rule,
          pattern: build_pattern_for_rule(rule)
        }
      end
    end

    def build_pattern_for_rule(rule)
      # Build regex pattern based on rule type
      pattern = rule.pattern.downcase
      case rule.pattern_type
      when 'exact'
        /\A#{Regexp.escape(pattern)}\z/
      when 'prefix'
        /\A#{Regexp.escape(pattern)}/
      when 'suffix'
        /#{Regexp.escape(pattern)}\z/
      else # contains (default)
        /#{Regexp.escape(pattern)}/
      end
    end

    def match_transaction(transaction, normalized_text, user: nil)
      return nil if normalized_text.blank?

      # FIRST: Try transfer classification (critical for P2P vs merchant detection)
      transfer_result = match_transfer(transaction)
      return transfer_result if transfer_result

      # Try user rules (highest priority)
      if user && @user_rules_list&.any?
        user_result = match_user_rules(normalized_text)
        return user_result if user_result && user_result.confidence >= 0.7
      end

      # Then try system rules with the inverted index
      system_result = match_system_rules_indexed(normalized_text)
      return system_result if system_result

      nil
    end

    def match_transfer(transaction)
      result = TransferClassifier.classify(transaction)
      return nil unless result

      category = @category_cache.find_by_slug('transfer')
      return nil unless category

      subcategory = @subcategory_cache.find_by_slug(result.subcategory_slug)

      BatchResult.new(
        category: category,
        subcategory: subcategory,
        tx_kind: result.tx_kind,
        counterparty_name: result.counterparty_name,
        confidence: result.confidence,
        method: 'transfer_classifier',
        explanation: result.explanation
      )
    end

    def match_user_rules(normalized_text)
      return nil unless @user_rules_list&.any?

      best_match = nil
      best_confidence = 0

      @user_rules_list.each do |entry|
        rule = entry[:rule]
        pattern = entry[:pattern]

        match = pattern.match(normalized_text)
        next unless match

        # Calculate confidence based on match quality
        confidence = calculate_user_rule_confidence(rule, match, normalized_text)
        next unless confidence > best_confidence

        best_confidence = confidence
        best_match = rule
      end

      return nil unless best_match

      best_match.record_match! # Track usage for analytics

      # Find subcategory
      subcategory = @subcategory_cache.find_by_category_and_keyword(best_match.category, [best_match.pattern])
      tx_kind = determine_tx_kind(best_match.category.slug)

      BatchResult.new(
        category: best_match.category,
        subcategory: subcategory,
        tx_kind: tx_kind,
        counterparty_name: nil,
        confidence: best_confidence,
        method: 'user_rule',
        explanation: "Matched user rule: '#{best_match.pattern}'"
      )
    end

    def calculate_user_rule_confidence(rule, match, text)
      base_confidence = 0.75

      # Boost for exact matches
      base_confidence += 0.15 if rule.pattern_type == 'exact'

      # Boost for longer patterns (more specific)
      base_confidence += 0.05 if rule.pattern.length > 10

      # Slight penalty for very short text (might be false positive)
      base_confidence -= 0.05 if text.length < 10

      base_confidence.clamp(0.5, 0.95)
    end

    def match_system_rules_indexed(normalized_text)
      words = normalized_text.split(' ')
      return nil if words.empty?

      # Fast path: check exact single-word matches first
      scores = Hash.new { |h, k| h[k] = { score: 0, keywords: [] } }

      words.each do |word|
        # Exact match lookup (O(1))
        if @exact_keywords[word]
          @exact_keywords[word].each do |entry|
            scores[entry[:category_slug]][:score] += entry[:weight]
            scores[entry[:category_slug]][:keywords] << word
          end
        end

        # Check indexed multi-word patterns starting with this word
        if @keyword_index[word]
          @keyword_index[word].each do |entry|
            # Only test regex if first word matches (already confirmed)
            if normalized_text.match?(entry[:pattern])
              scores[entry[:category_slug]][:score] += entry[:weight]
              scores[entry[:category_slug]][:keywords] << entry[:keyword]
            end
          end
        end
      end

      return nil if scores.empty?

      # Find best category
      best_slug, best_data = scores.max_by { |_, data| data[:score] }
      return nil unless best_slug && best_data[:score] > 0

      # Resolve category from cache
      category = @category_cache.find_by_slug(best_slug)
      return nil unless category

      # Calculate confidence
      matched_keywords = best_data[:keywords].uniq
      has_multiword = matched_keywords.any? { |k| k.include?(' ') }
      base_confidence = has_multiword ? 0.90 : 0.75
      confidence = [base_confidence + (best_data[:score] * 0.02), 0.95].min

      # Find subcategory
      subcategory = @subcategory_cache.find_by_category_and_keyword(category, matched_keywords)
      tx_kind = determine_tx_kind(best_slug)

      BatchResult.new(
        category: category,
        subcategory: subcategory,
        tx_kind: tx_kind,
        counterparty_name: nil,
        confidence: confidence,
        method: 'rule',
        explanation: "Matched keywords: #{matched_keywords.join(', ')}"
      )
    end

    # Determine transaction kind based on category
    def determine_tx_kind(category_slug)
      case category_slug
      when 'transfer' then 'transfer_p2p'
      when 'salary' then 'income_salary'
      when 'investment' then 'investment'
      when 'emi' then 'loan_emi'
      when 'tax' then 'tax'
      else 'spend'
      end
    end
  end
end
