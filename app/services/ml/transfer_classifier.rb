# frozen_string_literal: true

module ML
  # Classifies transfer transactions into subcategories
  # This is critical for distinguishing P2P transfers from actual spending
  #
  # Transfer Types:
  # - Self Transfer: Own account, CC payments, wallet to bank
  # - P2P Transfer: Person-to-person (friends, family, rent to landlord)
  # - Wallet Load: Paytm/PhonePe/GPay wallet top-ups
  #
  class TransferClassifier
    # UPI VPA suffixes that indicate wallet/payment apps (could be merchant or personal)
    WALLET_VPA_SUFFIXES = %w[
      @paytm @ptyes @pthdfc @ptaxis @ptsbi
      @ybl @yapl @ibl
      @oksbi @okaxis @okhdfc @okicici
      @apl @amazonpay
      @freecharge @mobikwik
      @gpay @gpy
    ].freeze

    # Known merchant VPA patterns (these are NOT P2P even if they look like names)
    MERCHANT_VPA_PATTERNS = [
      /zomato/i, /swiggy/i, /uber/i, /ola/i, /amazon/i, /flipkart/i,
      /paytm.*merchant/i, /razorpay/i, /billdesk/i, /phonepe.*merchant/i,
      /bharatpe/i, /cred/i, /slice/i, /simpl/i,
      /@yesb0/i, /@yesbiz/i, # Business accounts
      /merchant/i, /business/i, /pvt/i, /ltd/i, /llp/i, /corp/i
    ].freeze

    # Self-transfer patterns
    SELF_TRANSFER_PATTERNS = [
      /\bself\b/i,
      /\bown\s*a\/?c/i,
      /\bown\s*account/i,
      /\bto\s*self\b/i,
      /\binternal\s*transfer/i,
      /\bcc\s*payment/i,
      /\bcredit\s*card\s*payment/i,
      /\bcc\s*bill/i,
      /\bcard\s*bill/i,
      /hdfc\s*cc/i, /icici\s*cc/i, /axis\s*cc/i, /sbi\s*cc/i, /kotak\s*cc/i,
      /\bsavings?\s*to\s*current/i,
      /\bcurrent\s*to\s*savings?/i,
      /\bfund\s*transfer\s*self/i,
      /\bown\s*transfer/i
    ].freeze

    # Wallet load patterns
    WALLET_LOAD_PATTERNS = [
      /paytm\s*(wallet|load|add|topup)/i,
      /phonepe\s*(wallet|load|add|topup)/i,
      /gpay\s*(wallet|load|add|topup)/i,
      /amazon\s*pay\s*(load|add|topup)/i,
      /wallet\s*(load|topup|add)/i,
      /add\s*money/i,
      /load\s*wallet/i,
      /mobikwik/i,
      /freecharge/i
    ].freeze

    # NEFT/RTGS/IMPS patterns (usually P2P or self)
    BANK_TRANSFER_PATTERNS = [
      /\bneft\b/i,
      /\brtgs\b/i,
      /\bimps\b/i,
      /\binft\b/i,
      /\bift\b/i
    ].freeze

    # Patterns that strongly indicate a personal name (not business)
    PERSONAL_NAME_INDICATORS = [
      /^[A-Z][a-z]+\s+[A-Z]$/,           # "Ravindra S"
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,     # "Amit Kumar"
      /^(Mr|Mrs|Ms|Dr)\s/i,              # "Mr Sharma"
      /\b(mom|dad|papa|mummy|bhai|didi|bro|sis)\b/i  # Family terms
    ].freeze

    # VPA patterns that indicate personal accounts
    PERSONAL_VPA_PATTERNS = [
      /^\d{10}@/,                    # Phone number VPAs
      /^[a-z]+\d*@(ok|yl|pt|gp)/i,  # Random username VPAs
      /^[a-z]+\.[a-z]+@/i           # name.surname@ VPAs
    ].freeze

    Result = Struct.new(
      :tx_kind,           # transfer_self, transfer_p2p, transfer_wallet, nil
      :subcategory_slug,  # transfer-self, transfer-p2p, transfer-wallet
      :counterparty_name, # Extracted name if P2P
      :confidence,        # 0.0 - 1.0
      :explanation,       # Human-readable explanation
      keyword_init: true
    )

    def initialize(transaction)
      @transaction = transaction
      @description = transaction.description || transaction.original_description || ''
      @normalized = NormalizationService.normalize(@description)
    end

    # Main classification method
    # Returns Result or nil if not a transfer
    def classify
      # First check if this looks like a transfer at all
      return nil unless transfer_likely?

      # Check in order of specificity
      result = classify_self_transfer ||
               classify_wallet_load ||
               classify_p2p_transfer ||
               classify_generic_transfer

      result
    end

    # Class method for convenience
    def self.classify(transaction)
      new(transaction).classify
    end

    private

    def transfer_likely?
      # Check for transfer-related keywords
      transfer_keywords = %w[upi neft rtgs imps transfer inft ift fund]
      wallet_keywords = %w[paytm phonepe gpay wallet load topup add\ money]

      transfer_keywords.any? { |kw| @normalized.include?(kw) } ||
        wallet_keywords.any? { |kw| @normalized.include?(kw) } ||
        @description.match?(/\b(UPI|NEFT|RTGS|IMPS)\b/i) ||
        extract_vpa.present?
    end

    def classify_self_transfer
      SELF_TRANSFER_PATTERNS.each do |pattern|
        if @description.match?(pattern) || @normalized.match?(pattern)
          return Result.new(
            tx_kind: 'transfer_self',
            subcategory_slug: 'transfer-self',
            counterparty_name: nil,
            confidence: 0.95,
            explanation: 'Self/own account transfer'
          )
        end
      end

      nil
    end

    def classify_wallet_load
      WALLET_LOAD_PATTERNS.each do |pattern|
        if @description.match?(pattern) || @normalized.match?(pattern)
          wallet_name = detect_wallet_name
          return Result.new(
            tx_kind: 'transfer_wallet',
            subcategory_slug: 'transfer-wallet',
            counterparty_name: wallet_name,
            confidence: 0.90,
            explanation: "Wallet load#{wallet_name ? " (#{wallet_name})" : ''}"
          )
        end
      end

      nil
    end

    def classify_p2p_transfer
      # Extract potential counterparty info
      vpa = extract_vpa
      name = extract_name

      # Skip if this looks like a merchant
      return nil if looks_like_merchant?(vpa, name)

      # Check if VPA looks personal
      if vpa && personal_vpa?(vpa)
        return Result.new(
          tx_kind: 'transfer_p2p',
          subcategory_slug: 'transfer-p2p',
          counterparty_name: name || extract_name_from_vpa(vpa),
          confidence: 0.90,
          explanation: "UPI transfer to individual (#{name || vpa})"
        )
      end

      # Check if name looks personal (and we have UPI/NEFT context)
      if name && personal_name?(name) && bank_transfer?
        return Result.new(
          tx_kind: 'transfer_p2p',
          subcategory_slug: 'transfer-p2p',
          counterparty_name: name,
          confidence: 0.85,
          explanation: "Transfer to individual (#{name})"
        )
      end

      nil
    end

    def classify_generic_transfer
      # Generic NEFT/RTGS/IMPS without clear recipient
      if bank_transfer? && !looks_like_merchant?(nil, extract_name)
        name = extract_name
        return Result.new(
          tx_kind: 'transfer_p2p',
          subcategory_slug: 'transfer-p2p',
          counterparty_name: name,
          confidence: 0.70,
          explanation: "Bank transfer#{name ? " to #{name}" : ''}"
        )
      end

      nil
    end

    # =========================================
    # Helper Methods
    # =========================================

    def extract_vpa
      # Match UPI VPA patterns like "name@bank" or "phone@bank"
      match = @description.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i)
      match&.[](1)&.downcase
    end

    def extract_name
      # Try to extract name from UPI description
      # Common patterns:
      # - UPI/NAME/vpa/...
      # - NEFT TO NAME
      # - IMPS/NAME/...

      # UPI format: UPI/NAME/vpa/...
      if (match = @description.match(%r{UPI/([A-Z][A-Z\s]+?)/(.*@|payment|order)}i))
        name = match[1].strip
        return clean_name(name) if name.length > 2 && name.length < 50
      end

      # NEFT format: NEFT TO NAME or NEFT-NAME
      if (match = @description.match(/NEFT\s*(TO\s+)?([A-Z][A-Z\s]+)/i))
        name = match[2].strip
        return clean_name(name) if name.length > 2 && name.length < 50
      end

      # IMPS format: IMPS/NAME/...
      if (match = @description.match(%r{IMPS/([A-Z][A-Z\s]+?)/}i))
        name = match[1].strip
        return clean_name(name) if name.length > 2 && name.length < 30
      end

      # Generic: Look for capitalized name patterns
      if (match = @description.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]*)\b/))
        return match[1]
      end

      nil
    end

    def extract_name_from_vpa(vpa)
      return nil unless vpa

      # Extract readable part before @
      local_part = vpa.split('@').first
      return nil if local_part.match?(/^\d+$/) # Just numbers

      # Clean up and titleize
      local_part.gsub(/[0-9_.-]/, ' ').strip.titleize.presence
    end

    def clean_name(name)
      # Remove common noise words and clean up
      name = name.gsub(/\b(UPI|NEFT|IMPS|RTGS|PAYMENT|FROM|TO|FOR)\b/i, '')
      name = name.gsub(/\s+/, ' ').strip
      name.presence
    end

    def personal_vpa?(vpa)
      return false unless vpa

      # Check against personal VPA patterns
      PERSONAL_VPA_PATTERNS.any? { |pattern| vpa.match?(pattern) } ||
        # Simple personal VPAs (short usernames)
        vpa.match?(/^[a-z]{3,15}@/i)
    end

    def personal_name?(name)
      return false unless name

      # Check if name looks personal (not a business)
      PERSONAL_NAME_INDICATORS.any? { |pattern| name.match?(pattern) } ||
        # Short names (2-3 words, each capitalized)
        name.match?(/^[A-Z][a-z]+(\s+[A-Z][a-z]*){0,2}$/)
    end

    def looks_like_merchant?(vpa, name)
      # Check VPA against merchant patterns
      if vpa
        return true if MERCHANT_VPA_PATTERNS.any? { |pattern| vpa.match?(pattern) }
      end

      # Check name against business patterns
      if name
        business_patterns = [/pvt/i, /ltd/i, /llp/i, /corp/i, /inc/i, /company/i, /enterprises/i]
        return true if business_patterns.any? { |pattern| name.match?(pattern) }
      end

      false
    end

    def bank_transfer?
      BANK_TRANSFER_PATTERNS.any? { |pattern| @description.match?(pattern) }
    end

    def detect_wallet_name
      case @description.downcase
      when /paytm/ then 'Paytm'
      when /phonepe/ then 'PhonePe'
      when /gpay|googlepay/ then 'Google Pay'
      when /amazon\s*pay/ then 'Amazon Pay'
      when /mobikwik/ then 'MobiKwik'
      when /freecharge/ then 'FreeCharge'
      else nil
      end
    end
  end
end
