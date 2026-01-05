# frozen_string_literal: true

module ML
  # Fast, rule-based categorization using keywords and patterns
  # Handles 40-70% of transactions instantly and for free
  class RuleEngine
    # System rules with subcategory hints
    # Format: 'category_slug' => { keywords: [...], subcategory_hints: { keyword => subcategory_slug } }
    # NOTE: These are matched against normalized descriptions
    SYSTEM_RULES = {
      'food' => [
        'zomato', 'swiggy', 'uber eats', 'dominos', 'pizza', 'mcdonalds', 'kfc',
        'starbucks', 'dunkin', 'cafe', 'restaurant', 'food', 'dining', 'hotel', 'kitchen',
        'biryani', 'burger', 'coffee', 'tea', 'bakery', 'sweet', 'foodpanda',
        'payzomato', 'payswiggy', 'starbucksin' # UPI handles
      ],
      'transport' => [
        'uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'bus', 'cab',
        'taxi', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'fastag',
        'airlines', 'flight', 'makemytrip', 'goibibo', 'redbus', 'ola money',
        'indigo', 'spicejet', 'vistara', 'air india'
      ],
      'shopping' => [
        'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal',
        'shopclues', 'reliance', 'bigbasket', 'grofers', 'blinkit', 'zepto',
        'instamart', 'mall', 'store', 'mart', 'retail', 'bazaar',
        'grofersindia', 'groceries', 'bharatpe' # UPI handles and small business
      ],
      'utilities' => [
        'electricity', 'electric', 'bescom', 'power', 'water', 'gas', 'lpg',
        'bharat gas', 'indane', 'hp gas', 'airtel', 'jio', 'vodafone', 'vi',
        'bsnl', 'internet', 'broadband', 'wifi', 'mobile', 'recharge', 'dth',
        'tata sky', 'dish tv', 'netflix', 'amazon prime', 'hotstar', 'spotify',
        'disney', 'youtube premium', 'subscription', 'playstore', 'google play',
        'jiomobili' # Jio mobile recharge via paytm
      ],
      'housing' => [
        'rent', 'rental', 'house', 'flat', 'apartment', 'society', 'maintenance',
        'housing', 'property', 'pg ', 'hostel', 'lease',
        'rentomojo', 'rentomojo42', 'furlenco', 'nestaway', 'nobroker' # Rental services
      ],
      'health' => [
        'hospital', 'clinic', 'doctor', 'medical', 'medicine', 'pharmacy',
        'apollo', 'medplus', 'netmeds', 'pharmeasy', 'practo', 'lab', 'test',
        'health', 'dental', 'eye', 'diagnostic', 'insurance premium'
      ],
      'entertainment' => [
        'pvr', 'inox', 'cinema', 'movie', 'bookmyshow', 'event', 'concert',
        'game', 'gaming', 'playstation', 'xbox', 'steam', 'pub', 'bar', 'club'
      ],
      'business' => [
        'office', 'business', 'professional', 'consulting', 'freelance',
        'invoice', 'client', 'vendor', 'supplier'
      ],
      'transfer' => [
        'transfer', 'neft', 'rtgs', 'imps', 'upi', 'self', 'own account',
        'internal', 'fund transfer', 'inft', 'to self', 'own transfer'
      ],
      'salary' => [
        'salary', 'payroll', 'wages', 'income', 'credited by employer',
        'salary credit', 'payroll credit', 'cms', 'ltimindtree', 'tcs', 'infosys',
        'wipro', 'hcl', 'cognizant', 'accenture', 'capgemini', 'tech mahindra'
      ],
      'investment' => [
        'mutual fund', 'mf ', 'sip', 'stock', 'share', 'demat', 'zerodha',
        'groww', 'upstox', 'kuvera', 'coin', 'investment', 'fd ', 'fixed deposit',
        'rd ', 'recurring deposit', 'ppf', 'nps', 'nifty', 'sensex'
      ],
      'emi' => [
        'emi', 'loan', 'equated monthly', 'installment', 'bajaj', 'hdfc loan',
        'personal loan', 'home loan', 'car loan', 'credit card payment',
        'loan repayment', 'bajajpay', 'credit ca', 'credit card', 'bil'
      ],
      'tax' => [
        'income tax', 'gst', 'tds', 'tax', 'government', 'challan', 'e-filing',
        'itr', 'income tax return', 'advance tax', 'self assessment'
      ],
      'dividend' => [
        'dividend', 'div', 'intdiv', 'interim dividend', 'final dividend',
        'bonus', 'ach div', 'nsdl', 'cdsl', 'depository'
      ]
    }.freeze

    # @param transaction [Transaction]
    # @param user [User, nil] User for checking user-specific rules
    # @param category_cache [ML::CategoryCache, nil] Optional cache for category lookups
    # @param subcategory_cache [ML::SubcategoryCache, nil] Optional cache for subcategory lookups
    def initialize(transaction, user: nil, category_cache: nil, subcategory_cache: nil)
      @transaction = transaction
      @user = user
      @category_cache = category_cache || CategoryCache.instance
      @subcategory_cache = subcategory_cache || SubcategoryCache.instance
      @normalized_text = ML::NormalizationService.normalize(
        transaction.description || transaction.original_description || ''
      )
    end

    def categorize
      # FIRST: Try transfer classification (critical for P2P vs merchant detection)
      # This runs before all other rules to catch UPI/NEFT/IMPS transfers
      transfer_result = classify_transfer
      return transfer_result if transfer_result

      # Try user rules (highest priority - user's own preferences)
      user_rule_match = match_user_rules if @user
      return user_rule_match if user_rule_match && user_rule_match[:confidence] >= 0.7

      # Then try system rules (static, hand-crafted)
      system_rule_match = match_system_rules
      return system_rule_match if system_rule_match

      # Then try global patterns (learned from other users)
      global_match = match_global_patterns
      return global_match if global_match

      # No match
      { category: nil, subcategory: nil, confidence: 0.0, method: 'rule', explanation: 'No rule matches found' }
    end

    # Classify transfer transactions (P2P, Self, Wallet)
    # Returns result hash or nil
    def classify_transfer
      result = TransferClassifier.classify(@transaction)
      return nil unless result

      # Get transfer category
      category = @category_cache.find_by_slug('transfer')
      return nil unless category

      # Get subcategory
      subcategory = find_subcategory(result.subcategory_slug)

      {
        category: category,
        subcategory: subcategory,
        tx_kind: result.tx_kind,
        counterparty_name: result.counterparty_name,
        confidence: result.confidence,
        method: 'transfer_classifier',
        explanation: result.explanation
      }
    end

    private

    # Find subcategory by slug (uses cache)
    def find_subcategory(slug)
      return nil unless slug

      @subcategory_cache.find_by_slug(slug)
    end

    # Find subcategory by keyword match within a category (uses cache, no DB queries)
    def find_subcategory_by_keyword(category, matched_keywords)
      return nil unless category

      @subcategory_cache.find_by_category_and_keyword(category, matched_keywords)
    end

    def match_user_rules
      return nil unless @user

      # Load active user rules, ordered by priority
      user_rules = UserRule.for_user(@user)
      return nil if user_rules.empty?

      best_match = nil
      best_confidence = 0

      user_rules.find_each do |rule|
        # Try matching against both original and normalized text
        confidence = rule.match?(@normalized_text)
        confidence ||= rule.match?(@transaction.description)

        next unless confidence && confidence > best_confidence

        best_confidence = confidence
        best_match = rule
      end

      return nil unless best_match

      # Record the match for analytics
      best_match.record_match!

      # Find subcategory
      subcategory = find_subcategory_by_keyword(best_match.category, [best_match.pattern])

      {
        category: best_match.category,
        subcategory: subcategory,
        confidence: best_confidence,
        method: 'user_rule',
        explanation: "Matched user rule: '#{best_match.pattern}'"
      }
    end

    def match_system_rules
      best_match = nil
      best_score = 0
      matched_keywords = []

      SYSTEM_RULES.each do |category_slug, keywords|
        score = 0
        matched = []

        keywords.each do |keyword|
          # Use word boundary matching to avoid false positives (e.g., "bar" matching "carohitakbari")
          # Word boundaries ensure we match whole words, not substrings
          keyword_pattern = /\b#{Regexp.escape(keyword.downcase)}\b/

          if @normalized_text.match?(keyword_pattern)
            score += keyword.split(' ').length > 1 ? 3 : 2 # Multi-word matches are stronger
            matched << keyword
          end
        end

        if score > best_score
          best_score = score
          best_match = category_slug
          matched_keywords = matched
        end
      end

      return nil unless best_match && best_score > 0

      # Use cache instead of DB query
      category = @category_cache.find_by_slug(best_match)
      return nil unless category

      # Calculate confidence based on match strength
      # Exact multi-word match: 90-95%
      # Single keyword match: 70-85%
      # Multiple keywords: boost confidence
      base_confidence = matched_keywords.any? { |k| k.split(' ').length > 1 } ? 0.90 : 0.75
      confidence = [base_confidence + (best_score * 0.02), 0.95].min

      # Find subcategory based on matched keywords
      subcategory = find_subcategory_by_keyword(category, matched_keywords)

      # Determine tx_kind based on category
      tx_kind = determine_tx_kind(category.slug, @transaction.transaction_type)

      {
        category: category,
        subcategory: subcategory,
        tx_kind: tx_kind,
        confidence: confidence,
        method: 'rule',
        explanation: "Matched keywords: #{matched_keywords.join(', ')}"
      }
    end

    # Determine transaction kind based on category and type
    def determine_tx_kind(category_slug, transaction_type)
      case category_slug
      when 'transfer'
        'transfer_p2p' # Default, TransferClassifier provides more specific
      when 'salary'
        transaction_type == 'credit' ? 'income_salary' : 'spend'
      when 'investment'
        'investment'
      when 'emi'
        'loan_emi'
      when 'tax'
        'tax'
      else
        'spend'
      end
    end

    # Match against verified global patterns (cross-user learning)
    def match_global_patterns
      return nil if @normalized_text.blank?

      # Only check verified patterns (have been confirmed by multiple users)
      verified_patterns = GlobalPattern.verified.includes(:category)
      return nil if verified_patterns.empty?

      best_match = nil
      best_confidence = 0

      verified_patterns.find_each do |pattern|
        next unless pattern.matches?(@normalized_text)

        # Calculate confidence based on pattern stats
        confidence = calculate_global_pattern_confidence(pattern)
        next unless confidence > best_confidence

        best_confidence = confidence
        best_match = pattern
      end

      return nil unless best_match

      # Record the match for analytics
      best_match.record_match!

      # Use cache if available
      category = @category_cache&.find_by_id(best_match.category_id) || best_match.category

      # Find subcategory
      subcategory = find_subcategory_by_keyword(category, [best_match.pattern])

      # Determine tx_kind
      tx_kind = determine_tx_kind(category.slug, @transaction.transaction_type)

      {
        category: category,
        subcategory: subcategory,
        tx_kind: tx_kind,
        confidence: best_confidence,
        method: 'global_pattern',
        explanation: "Matched global pattern '#{best_match.pattern}' (#{best_match.user_count} users)"
      }
    end

    def calculate_global_pattern_confidence(pattern)
      # Base confidence for verified patterns
      base = 0.75

      # Boost for more users confirming the pattern
      user_boost = [pattern.user_count * 0.02, 0.10].min

      # Boost for more matches (pattern is reliable)
      match_boost = [Math.log(pattern.match_count + 1) * 0.02, 0.05].min

      [base + user_boost + match_boost, 0.90].min
    end
  end
end
