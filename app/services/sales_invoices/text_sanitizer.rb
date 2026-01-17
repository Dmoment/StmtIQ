# frozen_string_literal: true

module SalesInvoices
  # Sanitizes text input to prevent XSS attacks in PDFs and emails
  # Single Responsibility: Text sanitization only
  # Dependency Inversion: Can be swapped with different sanitizer implementations
  class TextSanitizer
    # Security: Whitelist allowed tags for rich text fields
    ALLOWED_TAGS = %w[b i u strong em].freeze
    ALLOWED_ATTRIBUTES = %w[].freeze

    def self.sanitize(text)
      new.sanitize(text)
    end

    def sanitize(text)
      return nil if text.nil?
      return text if text.blank?

      # Remove all HTML tags and scripts to prevent XSS
      ActionController::Base.helpers.sanitize(
        text.to_s,
        tags: ALLOWED_TAGS,
        attributes: ALLOWED_ATTRIBUTES
      ).strip
    end

    # Sanitize a hash of attributes
    def sanitize_hash(hash, keys)
      hash.each_with_object({}) do |(key, value), result|
        result[key] = keys.include?(key) ? sanitize(value) : value
      end
    end
  end
end
