# frozen_string_literal: true

class AICategorizer
  CATEGORY_KEYWORDS = {
    'food' => [
      'zomato', 'swiggy', 'uber eats', 'dominos', 'pizza', 'mcdonalds', 'kfc',
      'starbucks', 'cafe', 'restaurant', 'food', 'dining', 'hotel', 'kitchen',
      'biryani', 'burger', 'coffee', 'tea', 'bakery', 'sweet'
    ],
    'transport' => [
      'uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'bus', 'cab',
      'taxi', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'fastag',
      'airlines', 'flight', 'makemytrip', 'goibibo', 'redbus'
    ],
    'shopping' => [
      'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal',
      'shopclues', 'reliance', 'bigbasket', 'grofers', 'blinkit', 'zepto',
      'instamart', 'mall', 'store', 'mart', 'retail', 'bazaar'
    ],
    'utilities' => [
      'electricity', 'electric', 'bescom', 'power', 'water', 'gas', 'lpg',
      'bharat gas', 'indane', 'hp gas', 'airtel', 'jio', 'vodafone', 'vi',
      'bsnl', 'internet', 'broadband', 'wifi', 'mobile', 'recharge', 'dth',
      'tata sky', 'dish tv', 'netflix', 'amazon prime', 'hotstar', 'spotify'
    ],
    'housing' => [
      'rent', 'rental', 'house', 'flat', 'apartment', 'society', 'maintenance',
      'housing', 'property', 'pg ', 'hostel'
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
      'internal', 'fund transfer'
    ],
    'salary' => [
      'salary', 'payroll', 'wages', 'income', 'credited by employer'
    ],
    'investment' => [
      'mutual fund', 'mf ', 'sip', 'stock', 'share', 'demat', 'zerodha',
      'groww', 'upstox', 'kuvera', 'coin', 'investment', 'fd ', 'fixed deposit',
      'rd ', 'recurring deposit', 'ppf', 'nps'
    ],
    'emi' => [
      'emi', 'loan', 'equated monthly', 'installment', 'bajaj', 'hdfc loan',
      'personal loan', 'home loan', 'car loan', 'credit card payment'
    ],
    'tax' => [
      'income tax', 'gst', 'tds', 'tax', 'government', 'challan', 'e-filing'
    ]
  }.freeze

  def initialize(transaction)
    @transaction = transaction
  end

  def categorize!
    # Step 1: Try rule-based categorization first (fast & free)
    category, confidence, explanation = rule_based_categorization

    # Step 2: If low confidence, use AI (if configured)
    if confidence < 0.7 && ai_enabled?
      ai_result = ai_categorization
      if ai_result[:confidence] > confidence
        category = ai_result[:category]
        confidence = ai_result[:confidence]
        explanation = ai_result[:explanation]
      end
    end

    # Update transaction with AI category
    @transaction.update!(
      ai_category: category,
      confidence: confidence,
      ai_explanation: explanation
    )

    { category: category, confidence: confidence, explanation: explanation }
  end

  class << self
    def categorize_batch(transactions)
      transactions.map do |tx|
        new(tx).categorize!
      end
    end

    def categorize_statement(statement)
      transactions = statement.transactions.uncategorized
      categorize_batch(transactions)
    end
  end

  private

  def rule_based_categorization
    description = @transaction.description&.downcase || ''
    original = @transaction.original_description&.downcase || ''
    text = "#{description} #{original}"

    best_match = nil
    best_score = 0

    CATEGORY_KEYWORDS.each do |category_slug, keywords|
      score = keywords.count { |keyword| text.include?(keyword.downcase) }
      if score > best_score
        best_score = score
        best_match = category_slug
      end
    end

    if best_match && best_score > 0
      category = Category.find_by(slug: best_match)
      confidence = [0.5 + (best_score * 0.15), 0.95].min
      explanation = "Matched keywords for #{best_match}"

      return [category, confidence, explanation]
    end

    # Default to 'other' with low confidence
    other_category = Category.find_by(slug: 'other')
    [other_category, 0.2, 'No keyword matches found']
  end

  def ai_enabled?
    ENV['OPENAI_API_KEY'].present?
  end

  def ai_categorization
    return { category: nil, confidence: 0, explanation: 'AI not configured' } unless ai_enabled?

    client = OpenAI::Client.new

    category_list = Category.pluck(:slug, :name, :description).map do |slug, name, desc|
      "- #{slug}: #{name} (#{desc})"
    end.join("\n")

    prompt = <<~PROMPT
      Categorize this bank transaction into one of the following categories:

      #{category_list}

      Transaction:
      - Description: #{@transaction.description}
      - Amount: ₹#{@transaction.amount}
      - Type: #{@transaction.transaction_type}
      - Date: #{@transaction.transaction_date}

      Respond in JSON format:
      {
        "category": "category_slug",
        "confidence": 0.0 to 1.0,
        "explanation": "brief reason for categorization"
      }
    PROMPT

    response = client.chat(
      parameters: {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a financial transaction categorizer. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 150
      }
    )

    result = JSON.parse(response.dig('choices', 0, 'message', 'content'))
    category = Category.find_by(slug: result['category'])

    {
      category: category,
      confidence: result['confidence'].to_f,
      explanation: result['explanation']
    }
  rescue StandardError => e
    Rails.logger.error("AI categorization failed: #{e.message}")
    { category: nil, confidence: 0, explanation: "AI error: #{e.message}" }
  end
end
