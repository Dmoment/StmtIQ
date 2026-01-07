# frozen_string_literal: true

module Invoices
  class FieldParser
    # Amount patterns - prioritized by specificity (most specific first)
    # IMPORTANT: Use FINAL_AMOUNT_PATTERNS first, then fall back to AMOUNT_PATTERNS
    FINAL_AMOUNT_PATTERNS = [
      # "Total (INR) ₹4,625.60" - Parentheses REQUIRED for currency indicator
      /total\s*\((?:inr|₹)\)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
      # "Grand Total: ₹1234.56" or "Net Payable: Rs. 1,234.56"
      /(?:grand\s*total|net\s*payable|payable\s*amount|amount\s*payable|final\s*amount|invoice\s*total)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
      # "Total Due: ₹1234.56"
      /(?:total\s*due|amount\s*due|balance\s*due)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i
    ].freeze

    AMOUNT_PATTERNS = [
      # "Total: Rs. 1,234.56" - generic total
      /(?:total)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
      # "Rs. 1,234.56 Total" or "₹1234 only"
      /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)\s*(?:total|only|-\/|-)/i,
      # "Total Amount: 1,234.56"
      /(?:total\s*amount|invoice\s*amount)[:\s]*([\d,]+(?:\.\d{2})?)/i,
      # Fallback: any currency symbol followed by amount
      /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i
    ].freeze

    # Date patterns - common Indian date formats
    DATE_PATTERNS = [
      # "Invoice Date: 01/01/2024" or "Date: 01-01-2024"
      /(?:invoice\s*date|date|dated|bill\s*date|order\s*date)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      # "Dec 03, 2025" or "December 03, 2025" (Mon DD, YYYY with comma)
      /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
      # "01 Jan 2024" or "01 January 2024" (DD Mon YYYY)
      /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
      # "2024-01-01" ISO format
      /(\d{4}-\d{2}-\d{2})/,
      # Fallback: DD/MM/YYYY or DD-MM-YYYY
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/
    ].freeze

    # GSTIN pattern: 2 state digits + 10 PAN + 1 entity + 1 Z + 1 checksum
    GSTIN_PATTERN = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/

    # Invoice number patterns
    INVOICE_NUMBER_PATTERNS = [
      /(?:invoice\s*no\.?|inv\.?\s*no\.?|invoice\s*#|invoice\s*number|bill\s*no\.?)[:\s]*([A-Z0-9\-\/]+)/i,
      /(?:receipt\s*no\.?|order\s*id|order\s*no\.?)[:\s]*([A-Z0-9\-\/]+)/i,
      /(?:ref\.?\s*no\.?|reference)[:\s]*([A-Z0-9\-\/]+)/i
    ].freeze

    # Known Indian vendors and their patterns for better matching
    KNOWN_VENDORS = {
      'Amazon' => ['amazon.in', 'amazon india', 'cloudtail', 'appario', 'amazon seller', 'a]mazon'],
      'Flipkart' => ['flipkart', 'ekart', 'flipkart india', 'flipkart internet'],
      'Swiggy' => ['swiggy', 'bundl technologies', 'swiggy instamart'],
      'Zomato' => ['zomato', 'zomato media', 'zomato hyperpure'],
      'Uber' => ['uber india', 'uber b.v.', 'uber eats'],
      'Ola' => ['ola', 'ani technologies', 'ola cabs'],
      'BigBasket' => ['bigbasket', 'supermarket grocery', 'innovative retail'],
      'Dunzo' => ['dunzo', 'dunzo digital'],
      'PhonePe' => ['phonepe', 'phonepe private'],
      'Razorpay' => ['razorpay', 'razorpay software'],
      'Paytm' => ['paytm', 'one97', 'paytm mall'],
      'MakeMyTrip' => ['makemytrip', 'mmt', 'make my trip'],
      'Goibibo' => ['goibibo', 'ibibo'],
      'BookMyShow' => ['bookmyshow', 'bigtree', 'book my show'],
      'Urban Company' => ['urbancompany', 'urban company', 'urbanclap'],
      'Practo' => ['practo', 'practo technologies'],
      'Myntra' => ['myntra', 'myntra designs'],
      'Nykaa' => ['nykaa', 'fsn e-commerce'],
      'Zepto' => ['zepto', 'kiranakart'],
      'Blinkit' => ['blinkit', 'grofers'],
      'Refrens' => ['refrens', 'refrens internet']
    }.freeze

    attr_reader :text

    def initialize(text)
      @text = text.to_s
    end

    def parse
      {
        vendor_name: extract_vendor_name,
        vendor_gstin: extract_gstin,
        invoice_number: extract_invoice_number,
        invoice_date: extract_date,
        total_amount: extract_amount,
        currency: 'INR',
        confidence: calculate_confidence
      }
    end

    private

    # Performance: Memoize to avoid re-computation in calculate_confidence
    def extract_amount
      @extract_amount ||= find_amount
    end

    def find_amount
      # Try FINAL patterns first (Grand Total, Total INR, Net Payable, etc.)
      amount = try_amount_patterns(FINAL_AMOUNT_PATTERNS)
      return amount if amount

      # Fall back to generic amount patterns
      try_amount_patterns(AMOUNT_PATTERNS)
    end

    def try_amount_patterns(patterns)
      patterns.each do |pattern|
        if (match = @text.match(pattern))
          amount_str = match[1].gsub(',', '')
          amount = amount_str.to_f
          # Sanity check: amount should be positive and reasonable
          return amount if amount.positive? && amount < 100_000_000
        end
      end
      nil
    end

    # Performance: Memoize to avoid re-computation in calculate_confidence
    def extract_date
      @extract_date ||= find_date
    end

    def find_date
      DATE_PATTERNS.each do |pattern|
        if (match = @text.match(pattern))
          return parse_date(match[1])
        end
      end
      nil
    end

    def parse_date(date_str)
      # Clean up the date string (remove extra whitespace, normalize commas)
      cleaned = date_str.strip.gsub(/\s+/, ' ')

      # Try common Indian date formats
      formats = [
        '%d/%m/%Y', '%d-%m-%Y', '%d/%m/%y', '%d-%m-%y',
        '%Y-%m-%d', '%d %b %Y', '%d %B %Y', '%d%b%Y',
        '%b %d, %Y', '%B %d, %Y', '%b %d %Y', '%B %d %Y'  # Dec 03, 2025 format
      ]

      formats.each do |fmt|
        date = Date.strptime(cleaned, fmt)
        # Sanity check: date should be reasonable (not too old or in far future)
        return date if date.year >= 2000 && date <= Date.current + 1.year
      rescue ArgumentError
        next
      end

      nil
    end

    # Performance: Memoize to avoid re-computation in calculate_confidence
    def extract_gstin
      @extract_gstin ||= begin
        match = @text.match(GSTIN_PATTERN)
        match ? match[0] : nil
      end
    end

    # Performance: Memoize to avoid re-computation in calculate_confidence
    def extract_invoice_number
      @extract_invoice_number ||= find_invoice_number
    end

    def find_invoice_number
      INVOICE_NUMBER_PATTERNS.each do |pattern|
        if (match = @text.match(pattern))
          invoice_num = match[1].strip
          # Sanity check: should be reasonable length
          return invoice_num if invoice_num.length.between?(3, 50)
        end
      end
      nil
    end

    # Performance: Memoize to avoid re-computation in calculate_confidence
    def extract_vendor_name
      @extract_vendor_name ||= find_vendor_name
    end

    # SRP: Broken into smaller focused methods
    def find_vendor_name
      # Strategy 1: Check known vendors (most reliable)
      known = match_known_vendor
      return known if known

      # Strategy 2: Extract from common patterns
      extract_vendor_from_patterns
    end

    def match_known_vendor
      text_lower = @text.downcase
      KNOWN_VENDORS.each do |normalized_name, patterns|
        patterns.each do |pattern|
          return normalized_name if text_lower.include?(pattern.downcase)
        end
      end
      nil
    end

    def extract_vendor_from_patterns
      vendor_patterns = [
        /(?:sold\s*by|from|seller|merchant|vendor)[:\s]*([A-Za-z][A-Za-z\s&\.]{2,40})/i,
        /(?:billed\s*by|invoice\s*from)[:\s]*([A-Za-z][A-Za-z\s&\.]{2,40})/i,
        /(?:company\s*name|business\s*name)[:\s]*([A-Za-z][A-Za-z\s&\.]{2,40})/i
      ]

      vendor_patterns.each do |pattern|
        if (match = @text.match(pattern))
          return clean_vendor_name(match[1])
        end
      end
      nil
    end

    def clean_vendor_name(raw_name)
      vendor = raw_name.strip.titleize
      # Remove common suffixes
      vendor = vendor.gsub(/\s*(Private|Pvt|Ltd|Limited|LLP|Inc|Corp)\s*/i, ' ').strip
      vendor.length >= 2 ? vendor : nil
    end

    def calculate_confidence
      fields_found = 0.0
      weights = {
        amount: 1.5,      # Most important
        date: 1.0,
        vendor: 1.0,
        invoice_number: 0.5,
        gstin: 0.5
      }

      total_weight = weights.values.sum

      fields_found += weights[:amount] if extract_amount
      fields_found += weights[:date] if extract_date
      fields_found += weights[:vendor] if extract_vendor_name
      fields_found += weights[:invoice_number] if extract_invoice_number
      fields_found += weights[:gstin] if extract_gstin

      (fields_found / total_weight).round(2)
    end
  end
end
