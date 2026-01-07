# frozen_string_literal: true

module Invoices
  # Analyzes extracted text quality to determine if OCR is needed
  # SOLID: Single Responsibility - Only analyzes text quality
  class TextQualityAnalyzer
    # Quality thresholds
    MIN_TEXT_LENGTH = 200
    MIN_ALPHA_RATIO = 0.5        # At least 50% should be alphanumeric
    MAX_GARBAGE_RATIO = 0.1      # No more than 10% garbage characters
    MIN_WORD_LENGTH_AVG = 2.5    # Average word length should be reasonable
    MIN_SPACE_RATIO = 0.05       # At least 5% spaces (indicates word separation)

    # Invoice-specific keywords that indicate valid content
    INVOICE_KEYWORDS = %w[
      invoice total amount date tax gst gstin bill receipt
      payment due subtotal grand net payable order quantity
      price rate discount cgst sgst igst rupee inr rs seller
      buyer vendor customer shipping address description item
    ].freeze

    # Patterns that indicate valid invoice content
    AMOUNT_PATTERN = /(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{2})?/i
    DATE_PATTERN = /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/
    GSTIN_PATTERN = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/

    attr_reader :text

    def initialize(text)
      @text = text.to_s.strip
    end

    # Returns a quality assessment with score and recommendation
    def analyze
      return empty_text_result if text.empty?
      return too_short_result if text.length < MIN_TEXT_LENGTH

      score = calculate_quality_score
      signals = gather_quality_signals

      {
        quality: quality_level(score),
        score: score,
        needs_ocr: score < 0.4,
        signals: signals,
        recommendation: recommendation(score, signals)
      }
    end

    # Quick check: does text need OCR?
    def needs_ocr?
      return true if text.empty?
      return true if text.length < MIN_TEXT_LENGTH
      return true if garbage_ratio > MAX_GARBAGE_RATIO
      return true if !has_invoice_keywords? && !has_amount_pattern?

      calculate_quality_score < 0.4
    end

    # Quick check: is text good enough for rule-based extraction?
    def good_enough_for_rules?
      !needs_ocr? && has_invoice_keywords? && has_amount_pattern?
    end

    private

    def empty_text_result
      {
        quality: :empty,
        score: 0.0,
        needs_ocr: true,
        signals: { empty: true },
        recommendation: 'No text extracted. OCR required.'
      }
    end

    def too_short_result
      {
        quality: :too_short,
        score: 0.1,
        needs_ocr: true,
        signals: { length: text.length, min_required: MIN_TEXT_LENGTH },
        recommendation: "Text too short (#{text.length} chars). OCR recommended."
      }
    end

    def calculate_quality_score
      scores = []

      # Length score (0-1)
      length_score = [text.length / 1000.0, 1.0].min
      scores << length_score * 0.15

      # Alpha ratio score (0-1)
      alpha_score = alpha_ratio >= MIN_ALPHA_RATIO ? 1.0 : alpha_ratio / MIN_ALPHA_RATIO
      scores << alpha_score * 0.2

      # Garbage ratio score (0-1, inverted)
      garbage_score = garbage_ratio <= MAX_GARBAGE_RATIO ? 1.0 : 1.0 - (garbage_ratio - MAX_GARBAGE_RATIO)
      scores << [garbage_score, 0].max * 0.2

      # Word structure score (0-1)
      word_score = average_word_length >= MIN_WORD_LENGTH_AVG ? 1.0 : average_word_length / MIN_WORD_LENGTH_AVG
      scores << word_score * 0.15

      # Invoice keywords score (0-1)
      keyword_score = keyword_count >= 3 ? 1.0 : keyword_count / 3.0
      scores << keyword_score * 0.15

      # Invoice patterns score (0-1)
      pattern_score = 0.0
      pattern_score += 0.4 if has_amount_pattern?
      pattern_score += 0.3 if has_date_pattern?
      pattern_score += 0.3 if has_gstin_pattern?
      scores << pattern_score * 0.15

      scores.sum.round(2)
    end

    def gather_quality_signals
      {
        text_length: text.length,
        alpha_ratio: alpha_ratio.round(3),
        garbage_ratio: garbage_ratio.round(3),
        average_word_length: average_word_length.round(2),
        keyword_count: keyword_count,
        has_amount: has_amount_pattern?,
        has_date: has_date_pattern?,
        has_gstin: has_gstin_pattern?,
        space_ratio: space_ratio.round(3)
      }
    end

    def quality_level(score)
      case score
      when 0.8..1.0 then :high
      when 0.6...0.8 then :medium
      when 0.4...0.6 then :low
      else :poor
      end
    end

    def recommendation(score, signals)
      if score >= 0.7 && signals[:has_amount]
        'Text quality is good. Proceed with rule-based extraction.'
      elsif score >= 0.4 && signals[:has_amount]
        'Text quality is acceptable. Rule extraction may work, OCR as fallback.'
      elsif score >= 0.4
        'Text extracted but no amount found. Try OCR for better results.'
      else
        'Poor text quality. OCR strongly recommended.'
      end
    end

    # Character analysis helpers
    def alpha_ratio
      return 0.0 if text.empty?

      alphanumeric = text.count('a-zA-Z0-9')
      alphanumeric.to_f / text.length
    end

    def garbage_ratio
      return 0.0 if text.empty?

      # Garbage: control chars, replacement char
      # Count characters that are control chars or Unicode replacement char
      garbage_count = 0
      text.each_char do |char|
        code = char.ord
        # Control characters (0x00-0x1F, 0x7F-0x9F) or Unicode replacement (0xFFFD)
        if (code <= 0x1F) || (code >= 0x7F && code <= 0x9F) || code == 0xFFFD
          garbage_count += 1
        end
      end
      garbage_count.to_f / text.length
    end

    def space_ratio
      return 0.0 if text.empty?

      text.count(" \t\n").to_f / text.length
    end

    def average_word_length
      words = text.split(/\s+/).reject(&:empty?)
      return 0.0 if words.empty?

      total_length = words.sum(&:length)
      total_length.to_f / words.size
    end

    # Invoice content detection
    def keyword_count
      text_lower = text.downcase
      INVOICE_KEYWORDS.count { |keyword| text_lower.include?(keyword) }
    end

    def has_invoice_keywords?
      keyword_count >= 2
    end

    def has_amount_pattern?
      text.match?(AMOUNT_PATTERN)
    end

    def has_date_pattern?
      text.match?(DATE_PATTERN)
    end

    def has_gstin_pattern?
      text.match?(GSTIN_PATTERN)
    end
  end
end
