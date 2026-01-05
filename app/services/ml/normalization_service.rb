# frozen_string_literal: true

module ML
  # Normalizes transaction descriptions for better ML accuracy
  # This is the "hidden hero" that makes everything else 10x better
  class NormalizationService
    # Common patterns to remove/clean
    UPI_PATTERNS = /\b(upi|vpa|@)\w*/i
    REFERENCE_PATTERNS = /\b(ref|refno|ref no|reference|txn id|txnid|transaction id)[\s:]*[\w-]+/i
    DATE_PATTERNS = /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/
    TIME_PATTERNS = /\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/i
    AMOUNT_PATTERNS = /₹[\d,]+\.?\d*|rs\.?\s*[\d,]+\.?\d*/i
    ACCOUNT_PATTERNS = /\b(ac|acc|account|a\/c)[\s:]*[\w-]+/i
    TRANSACTION_ID_PATTERNS = /\b(txn|transaction|id|tid)[\s:]*[\w-]+/i

    # Common merchant/service name patterns to extract (including embedded in UPI handles)
    # Order matters - more specific patterns first
    MERCHANT_EXTRACTORS = [
      # Food delivery (including UPI handles like payzomato, swiggyupi)
      /\b(swiggy|zomato|uber\s*eats|dominos|mcdonalds|starbucks|dunkin)/i,
      /(pay)?zomato/i,
      /(pay)?swiggy/i,
      /starbucks(in)?/i,
      # Transport
      /\b(uber|ola|rapido|irctc|makemytrip)\b/i,
      # Shopping (including UPI handles)
      /\b(amazon|flipkart|myntra|ajio|nykaa|meesho)\b/i,
      /(grofers|blinkit|zepto|instamart|bigbasket)/i,
      # Utilities
      /\b(airtel|jio|vodafone|vi|bsnl)\b/i,
      /\b(netflix|spotify|prime|hotstar|disney|youtube)\b/i,
      # Payments
      /\b(paytm|phonepe|gpay|razorpay)\b/i,
      # Housing
      /\b(rentomojo|furlenco|nestaway)\b/i,
    ].freeze

    # Map embedded names to canonical merchant names
    MERCHANT_ALIASES = {
      'payzomato' => 'zomato',
      'payswiggy' => 'swiggy',
      'starbucksin' => 'starbucks',
      'grofersindia' => 'groceries blinkit',
      'grofers' => 'groceries blinkit',
    }.freeze

    # Common financial abbreviations that should be expanded
    # These help with matching similar transactions
    FINANCIAL_ABBREVIATIONS = {
      'intdiv' => 'interim dividend',
      'findiv' => 'final dividend',
      'div' => 'dividend',
      'int' => 'interest',
      'sal' => 'salary',
      'cred' => 'credit',
      'deb' => 'debit',
      'xfer' => 'transfer',
      'txn' => 'transaction',
      'emi' => 'emi loan',
      'neft' => 'neft transfer',
      'rtgs' => 'rtgs transfer',
      'imps' => 'imps transfer',
      'ach' => 'ach clearing',
    }.freeze

    # Known company/brand name patterns to split from concatenated strings
    # Include both parts of compound names for better splitting
    KNOWN_BRANDS = %w[
      asian paints steel motors bank
      tata infosys wipro hcl tech mahindra reliance
      hdfc icici axis kotak sbi pnb bob canara union
      itc nestle hindustan unilever britannia dabur marico
      bharti airtel jio vodafone idea
      maruti hyundai honda toyota suzuki bajaj hero tvs
      amazon flipkart myntra ajio zomato swiggy uber ola
      lulu mall market
    ].freeze

    def self.normalize(description)
      new(description).normalize
    end

    def initialize(description)
      @original = description.to_s.strip
    end

    def normalize
      return '' if @original.blank?

      cleaned = @original.dup
        .downcase
        .then { |s| remove_upi_patterns(s) }
        .then { |s| remove_reference_numbers(s) }
        .then { |s| remove_dates(s) }
        .then { |s| remove_times(s) }
        .then { |s| remove_amounts(s) }
        .then { |s| remove_account_numbers(s) }
        .then { |s| remove_transaction_ids(s) }
        .then { |s| normalize_whitespace(s) }
        .then { |s| remove_special_chars(s) }
        .then { |s| split_concatenated_words(s) }
        .then { |s| expand_financial_abbreviations(s) }
        .then { |s| extract_merchant_name(s) }
        .strip

      # Take first meaningful words (usually merchant + purpose)
      words = cleaned.split(' ').reject { |w| w.length < 2 }
      words.first(6).join(' ')
    end

    private

    def remove_upi_patterns(text)
      text.gsub(UPI_PATTERNS, '')
    end

    def remove_reference_numbers(text)
      text.gsub(REFERENCE_PATTERNS, '')
    end

    def remove_dates(text)
      text.gsub(DATE_PATTERNS, '')
    end

    def remove_times(text)
      text.gsub(TIME_PATTERNS, '')
    end

    def remove_amounts(text)
      text.gsub(AMOUNT_PATTERNS, '')
    end

    def remove_account_numbers(text)
      text.gsub(ACCOUNT_PATTERNS, '')
    end

    def remove_transaction_ids(text)
      text.gsub(TRANSACTION_ID_PATTERNS, '')
    end

    def normalize_whitespace(text)
      text.gsub(/\s+/, ' ')
    end

    def remove_special_chars(text)
      # Keep alphanumeric, spaces, and common separators
      text.gsub(/[^\w\s-]/, ' ')
    end

    # Split concatenated words like "asianpaintsintdiv" into "asian paints intdiv"
    def split_concatenated_words(text)
      result = text
      max_iterations = 3 # Prevent infinite loops

      max_iterations.times do
        new_result = split_words_once(result)
        break if new_result == result

        result = new_result
      end

      result
    end

    def split_words_once(text)
      words = text.split(' ')

      words.map do |word|
        # Skip short words or words that are already split
        next word if word.length < 6

        # Try to split by known brand names
        split_word = try_split_by_brands(word)
        next split_word if split_word != word

        # Try to split by CamelCase boundaries (for mixed case inputs)
        split_word = word.gsub(/([a-z])([A-Z])/, '\1 \2').downcase
        next split_word if split_word != word

        # Try to split by common financial suffixes
        split_word = try_split_by_financial_patterns(word)
        split_word
      end.join(' ')
    end

    # Try to split a word by known brand names
    def try_split_by_brands(word)
      KNOWN_BRANDS.each do |brand|
        if word.include?(brand) && word != brand
          # Split at the brand boundary
          parts = word.split(brand, 2)
          before = parts[0].strip
          after = parts[1].strip

          result = []
          result << before if before.length >= 2
          result << brand
          result << after if after.length >= 2

          return result.join(' ') if result.length > 1
        end
      end
      word
    end

    # Try to split by common financial abbreviation patterns
    # Only split at the END of words (suffixes) to avoid false positives
    def try_split_by_financial_patterns(word)
      # If the word itself IS a known abbreviation, don't split it
      return word if FINANCIAL_ABBREVIATIONS.key?(word)

      # Only check longer patterns first (to avoid "int" matching before "intdiv")
      # And only match at the END of words as suffixes
      FINANCIAL_ABBREVIATIONS.keys
        .select { |k| k.length >= 3 } # Only use patterns 3+ chars to avoid false positives
        .sort_by { |k| -k.length }
        .each do |abbrev|
        next unless word.end_with?(abbrev)

        # If the word IS the abbreviation exactly, don't split (nothing to split off)
        next if word == abbrev

        prefix = word[0..-(abbrev.length + 1)]
        # Don't split if the prefix looks like a fragment (too short)
        return "#{prefix} #{abbrev}" if prefix.length >= 3
      end
      word
    end

    # Expand financial abbreviations to full words
    def expand_financial_abbreviations(text)
      result = text.dup

      # Sort by length (longest first) to avoid partial replacements
      FINANCIAL_ABBREVIATIONS.keys.sort_by { |k| -k.length }.each do |abbrev|
        # Use word boundary to avoid false positives
        result = result.gsub(/\b#{Regexp.escape(abbrev)}\b/, FINANCIAL_ABBREVIATIONS[abbrev])
      end

      result
    end

    def extract_merchant_name(text)
      # First, apply aliases to convert embedded names to canonical names
      result = text.dup
      MERCHANT_ALIASES.each do |pattern, replacement|
        result = result.gsub(/#{pattern}/i, replacement)
      end

      # Try to extract known merchant names and prepend them for better matching
      merchant_pattern = MERCHANT_EXTRACTORS.find { |pattern| result.match?(pattern) }
      return result unless merchant_pattern

      match = result.match(merchant_pattern)
      return result unless match

      merchant = match[0].strip.downcase
      remaining = result.gsub(merchant_pattern, '').strip

      # Return merchant + remaining context (if any meaningful words remain)
      remaining_words = remaining.split(' ').reject { |w| w.length < 2 }
      if remaining_words.any?
        "#{merchant} #{remaining_words.first(3).join(' ')}"
      else
        merchant
      end
    end
  end
end
