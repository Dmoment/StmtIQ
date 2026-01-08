# frozen_string_literal: true

require 'pdf-reader'

module Gmail
  # SOLID: Single Responsibility - Only handles PDF attachment filtering
  class PdfFilter
    # Max attachment size for invoices (500KB)
    MAX_INVOICE_SIZE = 500 * 1024

    # Max pages for an invoice PDF
    MAX_INVOICE_PAGES = 2

    # Filename patterns that indicate an invoice
    INVOICE_KEYWORDS = %w[
      invoice receipt bill gst tax payment order confirmation
      booking ticket e-ticket eticket
    ].freeze

    # Filename patterns to skip (clearly not invoices)
    SKIP_KEYWORDS = %w[
      guideline policy terms conditions manual guide
      brochure catalog catalogue newsletter
    ].freeze

    # Checks if attachment should be skipped based on filename and size
    # @param filename [String] The attachment filename
    # @param size [Integer] The attachment size in bytes
    # @return [String, nil] Reason to skip, or nil if acceptable
    def should_skip?(filename:, size:)
      filename_lower = filename.downcase

      # Check for skip keywords
      SKIP_KEYWORDS.each do |keyword|
        return "filename contains '#{keyword}'" if filename_lower.include?(keyword)
      end

      # Check size limit
      if size > MAX_INVOICE_SIZE
        # Allow if filename strongly suggests invoice
        has_invoice_keyword = INVOICE_KEYWORDS.any? { |kw| filename_lower.include?(kw) }
        return "size #{size} bytes exceeds #{MAX_INVOICE_SIZE} bytes" unless has_invoice_keyword
      end

      nil
    end

    # Validates PDF page count
    # @param content [String] Binary PDF content
    # @return [Boolean] true if valid (≤ MAX_INVOICE_PAGES), false otherwise
    def valid_page_count?(content)
      page_count = pdf_page_count(content)
      return true unless page_count # Allow if unable to determine

      page_count <= MAX_INVOICE_PAGES
    end

    # Returns page count or nil if unable to determine
    # @param content [String] Binary PDF content
    # @return [Integer, nil] Page count or nil
    def pdf_page_count(content)
      reader = PDF::Reader.new(StringIO.new(content))
      reader.page_count
    rescue PDF::Reader::MalformedPDFError, PDF::Reader::UnsupportedFeatureError => e
      Rails.logger.warn("Could not read PDF page count: #{e.message}")
      nil
    rescue StandardError => e
      Rails.logger.warn("Error checking PDF page count: #{e.message}")
      nil
    end
  end
end
