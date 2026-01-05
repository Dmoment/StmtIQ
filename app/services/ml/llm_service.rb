# frozen_string_literal: true

module ML
  # LLM fallback for hard-to-categorize transactions
  # Only used when rules and embeddings fail
  # Principle: Use sparingly - target < 10% of transactions
  class LlmService
    MODEL = 'gpt-4o-mini' # Cost-effective, fast, good at structured output
    MAX_RETRIES = 3
    BATCH_SIZE = 10 # Process multiple transactions in one call for efficiency

    # @param transaction [Transaction]
    # @param normalized_text [String, nil] Pre-computed normalized text
    # @param category_cache [ML::CategoryCache, nil] Optional cache for category lookups
    def initialize(transaction, normalized_text: nil, category_cache: nil)
      @transaction = transaction
      @normalized_text = normalized_text || NormalizationService.normalize(
        transaction.description || transaction.original_description || ''
      )
      @category_cache = category_cache || CategoryCache.instance
    end

    def categorize
      return nil unless ai_enabled?
      return nil if @normalized_text.blank?

      result = call_llm
      return nil unless result

      # Use cache instead of DB query
      category = @category_cache.find_by_slug(result[:category])
      return nil unless category

      # Find subcategory if provided
      subcategory = find_subcategory(category, result[:subcategory])

      # Determine tx_kind
      tx_kind = result[:tx_kind] || determine_tx_kind(category.slug)

      {
        category: category,
        subcategory: subcategory,
        tx_kind: tx_kind,
        confidence: result[:confidence].to_f.clamp(0.5, 0.9), # LLM confidence capped at 90%
        method: 'llm',
        explanation: result[:explanation] || "AI categorized as #{category.name}"
      }
    end

    # Batch categorize multiple transactions for efficiency
    # Returns hash of transaction_id => result
    def self.categorize_batch(transactions, user: nil)
      return {} if transactions.empty?
      return {} unless new(transactions.first).send(:ai_enabled?)

      # Group transactions into batches
      results = {}
      transactions.each_slice(BATCH_SIZE) do |batch|
        batch_results = process_batch(batch)
        results.merge!(batch_results)
      end
      results
    end

    private

    def ai_enabled?
      openai_api_key.present?
    end

    def openai_api_key
      ENV['OPENAI_API_KEY'] || Rails.application.credentials.dig(:openai, :api_key)
    end

    def call_llm(retries: MAX_RETRIES)
      client = OpenAI::Client.new(access_token: openai_api_key)

      response = client.chat(
        parameters: {
          model: MODEL,
          messages: [
            { role: 'system', content: system_prompt },
            { role: 'user', content: user_prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1, # Low temperature for consistent categorization
          max_tokens: 150
        }
      )

      content = response.dig('choices', 0, 'message', 'content')
      return nil unless content

      parse_response(content)
    rescue => e
      handle_error(e, retries)
    end

    def handle_error(error, retries)
      # Handle rate limiting with exponential backoff
      if error.message.include?('429') && retries > 0
        wait_time = (MAX_RETRIES - retries + 1) * 2
        Rails.logger.warn("ML::LLMService: Rate limited, retrying in #{wait_time}s (#{retries} left)")
        sleep(wait_time)
        return call_llm(retries: retries - 1)
      end

      Rails.logger.error("ML::LLMService: API call failed: #{error.message}")
      nil
    end

    def parse_response(content)
      parsed = JSON.parse(content, symbolize_names: true)

      # Validate response structure
      return nil unless parsed[:category].present?

      {
        category: parsed[:category].to_s.downcase.strip,
        subcategory: parsed[:subcategory]&.to_s&.downcase&.strip,
        tx_kind: parsed[:tx_kind]&.to_s&.downcase&.strip,
        confidence: parsed[:confidence] || 0.7,
        explanation: parsed[:explanation]
      }
    rescue JSON::ParserError => e
      Rails.logger.error("ML::LLMService: Failed to parse JSON response: #{e.message}")
      Rails.logger.error("ML::LLMService: Raw content: #{content}")
      nil
    end

    def find_subcategory(category, subcategory_slug)
      return nil unless subcategory_slug.present?

      # Try to find by exact slug first
      sub = Subcategory.find_by(slug: subcategory_slug)
      return sub if sub

      # Try to find by category + partial slug match
      category.subcategories.find_by('slug LIKE ?', "%#{subcategory_slug}%")
    end

    def determine_tx_kind(category_slug)
      case category_slug
      when 'transfer' then 'transfer_p2p'
      when 'salary' then @transaction.transaction_type == 'credit' ? 'income_salary' : 'spend'
      when 'investment' then 'investment'
      when 'emi' then 'loan_emi'
      when 'tax' then 'tax'
      else 'spend'
      end
    end

    def system_prompt
      <<~PROMPT
        You are a financial transaction categorizer for Indian bank statements.
        Your job is to categorize transactions into the correct category AND subcategory.

        Available categories and subcategories:
        #{category_with_subcategories_list}

        Important Rules:
        1. TRANSFERS are critical - distinguish:
           - transfer-self: Own account, CC bill payment, savings to current
           - transfer-p2p: Person-to-person (UPI to individuals, NEFT to friends/family)
           - transfer-wallet: Paytm/PhonePe/GPay wallet loads
        2. UPI to merchants (Zomato, Swiggy, Amazon) = NOT transfer, categorize by merchant type
        3. EMI payments, loan repayments = "emi"
        4. Salary credits, payroll = "salary" with subcategory "salary-monthly"
        5. Dividends, interest = "salary" with subcategory "salary-investment"
        6. Food delivery (Swiggy/Zomato) = "food" / "food-delivery"
        7. Restaurants/cafes = "food" / "food-dining"
        8. Groceries (Blinkit/BigBasket) = "food" / "food-groceries"
        9. If unsure, use "other"

        Respond ONLY with valid JSON (no markdown):
        {"category": "category-slug", "subcategory": "subcategory-slug", "tx_kind": "spend|transfer_p2p|transfer_self|income_salary|investment|loan_emi", "confidence": 0.0-1.0, "explanation": "brief reason"}
      PROMPT
    end

    def user_prompt
      <<~PROMPT
        Categorize this transaction:

        Description: #{@transaction.description}
        Normalized: #{@normalized_text}
        Amount: ₹#{@transaction.amount}
        Type: #{@transaction.transaction_type}
        Date: #{@transaction.transaction_date}
      PROMPT
    end

    def category_list
      # Use cache for category list in prompts
      @category_cache.all.map { |cat| "- #{cat.slug}: #{cat.description}" }.join("\n")
    end

    def category_with_subcategories_list
      # Build hierarchical list of categories and subcategories
      @category_cache.all.map do |cat|
        subcats = cat.subcategories.ordered.map { |sub| "  - #{sub.slug}: #{sub.name}" }.join("\n")
        "#{cat.slug} (#{cat.description}):\n#{subcats}"
      end.join("\n\n")
    end

    # Class method for batch processing
    # @param transactions [Array<Transaction>]
    # @param category_cache [ML::CategoryCache, nil]
    # @return [Hash<Integer, Hash>]
    def self.process_batch(transactions, category_cache: nil)
      return {} if transactions.empty?

      cache = category_cache || CategoryCache.instance
      service = new(transactions.first, category_cache: cache)
      return {} unless service.send(:ai_enabled?)

      client = OpenAI::Client.new(access_token: service.send(:openai_api_key))

      # Build batch prompt
      tx_list = transactions.map.with_index do |tx, i|
        normalized = NormalizationService.normalize(tx.description || tx.original_description || '')
        "#{i + 1}. [ID:#{tx.id}] #{tx.description} | Normalized: #{normalized} | ₹#{tx.amount} | #{tx.transaction_type}"
      end.join("\n")

      # Use cache for category list
      category_slugs = cache.all.map(&:slug).join(', ')

      batch_prompt = <<~PROMPT
        Categorize these Indian bank transactions. For each, provide category slug and confidence.

        Transactions:
        #{tx_list}

        Available categories: #{category_slugs}

        Respond with JSON array (no markdown):
        [{"id": transaction_id, "category": "slug", "confidence": 0.0-1.0, "explanation": "reason"}, ...]
      PROMPT

      begin
        response = client.chat(
          parameters: {
            model: MODEL,
            messages: [
              { role: 'system', content: 'You are a financial transaction categorizer. Respond only with valid JSON array.' },
              { role: 'user', content: batch_prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 500
          }
        )

        content = response.dig('choices', 0, 'message', 'content')
        return {} unless content

        parse_batch_response(content, transactions, category_cache: cache)
      rescue => e
        Rails.logger.error("ML::LLMService: Batch processing failed: #{e.message}")
        {}
      end
    end

    # Parse batch LLM response
    # @param content [String] JSON response from LLM
    # @param transactions [Array<Transaction>]
    # @param category_cache [ML::CategoryCache]
    # @return [Hash<Integer, Hash>]
    def self.parse_batch_response(content, transactions, category_cache: nil)
      cache = category_cache || CategoryCache.instance
      parsed = JSON.parse(content, symbolize_names: true)

      # Handle both array and object with results key
      results_array = parsed.is_a?(Array) ? parsed : (parsed[:results] || parsed[:transactions] || [])

      # Build transaction lookup for tx_kind determination
      tx_lookup = transactions.index_by(&:id)

      results = {}
      results_array.each do |item|
        tx_id = item[:id].to_i
        next unless tx_id > 0

        # Use cache instead of DB query
        category = cache.find_by_slug(item[:category].to_s.downcase.strip)
        next unless category

        # Find subcategory
        subcategory = find_subcategory_for_batch(category, item[:subcategory])

        # Determine tx_kind
        tx = tx_lookup[tx_id]
        tx_kind = item[:tx_kind] || determine_tx_kind_for_batch(category.slug, tx&.transaction_type)

        results[tx_id] = {
          category: category,
          subcategory: subcategory,
          tx_kind: tx_kind,
          confidence: item[:confidence].to_f.clamp(0.5, 0.9),
          method: 'llm',
          explanation: item[:explanation] || "AI categorized as #{category.name}"
        }
      end
      results
    rescue JSON::ParserError => e
      Rails.logger.error("ML::LLMService: Failed to parse batch response: #{e.message}")
      {}
    end

    def self.find_subcategory_for_batch(category, subcategory_slug)
      return nil unless subcategory_slug.present?

      slug = subcategory_slug.to_s.downcase.strip
      Subcategory.find_by(slug: slug) ||
        category.subcategories.find_by('slug LIKE ?', "%#{slug}%")
    end

    def self.determine_tx_kind_for_batch(category_slug, transaction_type)
      case category_slug
      when 'transfer' then 'transfer_p2p'
      when 'salary' then transaction_type == 'credit' ? 'income_salary' : 'spend'
      when 'investment' then 'investment'
      when 'emi' then 'loan_emi'
      when 'tax' then 'tax'
      else 'spend'
      end
    end
  end
end
