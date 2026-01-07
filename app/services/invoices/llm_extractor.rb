# frozen_string_literal: true

module Invoices
  # LLM-based field extraction for ambiguous cases
  # Only used when rule-based extraction is uncertain
  # SOLID: Single Responsibility - Only handles LLM-based extraction
  class LlmExtractor
    class LlmNotConfiguredError < StandardError; end
    class LlmRequestError < StandardError; end

    # Max text to send to LLM (reduce tokens/cost)
    MAX_TEXT_LENGTH = 8000

    # Fields we want LLM to extract/validate
    FIELDS = %w[vendor_name invoice_number invoice_date total_amount vendor_gstin].freeze

    attr_reader :text, :candidates

    # @param text [String] Extracted text from document
    # @param candidates [Hash] Candidates found by rule-based extraction
    #   Example: { total_amount: [1234.56, 5000.00], vendor_name: ['Amazon', 'Cloudtail'] }
    def initialize(text, candidates: {})
      @text = text.to_s[0...MAX_TEXT_LENGTH]
      @candidates = candidates
    end

    # Extract fields using LLM
    # @return [Hash] Extracted fields with confidence
    def extract
      return unavailable_result unless llm_available?

      prompt = build_prompt
      response = call_llm(prompt)

      parse_llm_response(response)
    rescue LlmNotConfiguredError => e
      { error: e.message, llm_available: false }
    rescue LlmRequestError => e
      { error: e.message, llm_available: true }
    rescue StandardError => e
      Rails.logger.error("LLM extraction failed: #{e.message}")
      { error: "LLM extraction failed: #{e.message}" }
    end

    # Check if LLM is configured
    def self.available?
      ENV['OPENAI_API_KEY'].present? || ENV['ANTHROPIC_API_KEY'].present?
    end

    private

    def llm_available?
      self.class.available?
    end

    def unavailable_result
      {
        error: 'LLM not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.',
        llm_available: false
      }
    end

    def build_prompt
      prompt = <<~PROMPT
        You are an expert at extracting structured data from Indian invoices and receipts.
        Extract the following fields from the document text below.

        IMPORTANT GUIDELINES:
        1. For total_amount: Find the FINAL payable amount (Grand Total, Net Payable, Amount Due).
           Ignore subtotals, tax breakdowns, or item prices.
        2. For vendor_name: Find the company/seller name, NOT the buyer.
        3. For invoice_date: Use ISO format YYYY-MM-DD.
        4. For invoice_number: Find the unique invoice/receipt/order number.
        5. For vendor_gstin: Find the seller's GST number (15 characters: 2 digits + 10 chars + 3 chars).

        #{candidates_context}

        DOCUMENT TEXT:
        ---
        #{text}
        ---

        Respond ONLY with valid JSON in this exact format (no explanation):
        {
          "vendor_name": "string or null",
          "invoice_number": "string or null",
          "invoice_date": "YYYY-MM-DD or null",
          "total_amount": number or null,
          "vendor_gstin": "string or null",
          "confidence": 0.0 to 1.0
        }
      PROMPT

      prompt
    end

    def candidates_context
      return '' if candidates.empty?

      context = "\nCANDIDATES FOUND BY RULES (pick the best one):\n"
      candidates.each do |field, values|
        next if values.nil? || (values.respond_to?(:empty?) && values.empty?)

        values_str = Array(values).map(&:to_s).join(', ')
        context += "- #{field}: #{values_str}\n"
      end
      context
    end

    def call_llm(prompt)
      if ENV['OPENAI_API_KEY'].present?
        call_openai(prompt)
      elsif ENV['ANTHROPIC_API_KEY'].present?
        call_anthropic(prompt)
      else
        raise LlmNotConfiguredError, 'No LLM API key configured'
      end
    end

    def call_openai(prompt)
      require 'net/http'
      require 'json'

      uri = URI('https://api.openai.com/v1/chat/completions')
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.read_timeout = 30

      request = Net::HTTP::Post.new(uri)
      request['Content-Type'] = 'application/json'
      request['Authorization'] = "Bearer #{ENV['OPENAI_API_KEY']}"

      request.body = {
        model: 'gpt-4o-mini',  # Cost-effective model
        messages: [
          { role: 'system', content: 'You are a document parsing assistant. Output only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,  # Low temperature for consistency
        max_tokens: 500
      }.to_json

      response = http.request(request)

      unless response.is_a?(Net::HTTPSuccess)
        raise LlmRequestError, "OpenAI API error: #{response.code} - #{response.body}"
      end

      data = JSON.parse(response.body)
      data.dig('choices', 0, 'message', 'content')
    end

    def call_anthropic(prompt)
      require 'net/http'
      require 'json'

      uri = URI('https://api.anthropic.com/v1/messages')
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.read_timeout = 30

      request = Net::HTTP::Post.new(uri)
      request['Content-Type'] = 'application/json'
      request['x-api-key'] = ENV['ANTHROPIC_API_KEY']
      request['anthropic-version'] = '2023-06-01'

      request.body = {
        model: 'claude-3-haiku-20240307',  # Cost-effective model
        max_tokens: 500,
        messages: [
          { role: 'user', content: prompt }
        ]
      }.to_json

      response = http.request(request)

      unless response.is_a?(Net::HTTPSuccess)
        raise LlmRequestError, "Anthropic API error: #{response.code} - #{response.body}"
      end

      data = JSON.parse(response.body)
      data.dig('content', 0, 'text')
    end

    def parse_llm_response(response)
      return { error: 'Empty LLM response' } if response.blank?

      # Extract JSON from response (LLM might add explanation)
      json_match = response.match(/\{[\s\S]*\}/)
      return { error: 'No JSON in LLM response' } unless json_match

      data = JSON.parse(json_match[0])

      # Validate and transform response
      {
        vendor_name: data['vendor_name'],
        invoice_number: data['invoice_number'],
        invoice_date: parse_date(data['invoice_date']),
        total_amount: parse_amount(data['total_amount']),
        vendor_gstin: validate_gstin(data['vendor_gstin']),
        confidence: (data['confidence'] || 0.7).to_f,
        method: 'llm',
        llm_used: true
      }
    rescue JSON::ParserError => e
      { error: "Failed to parse LLM response: #{e.message}", raw_response: response }
    end

    def parse_date(date_str)
      return nil if date_str.blank?

      Date.parse(date_str)
    rescue ArgumentError
      nil
    end

    def parse_amount(amount)
      return nil if amount.nil?

      amount.to_f
    end

    def validate_gstin(gstin)
      return nil if gstin.blank?

      # GSTIN format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
      pattern = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/
      gstin.upcase.match?(pattern) ? gstin.upcase : nil
    end
  end
end
