# frozen_string_literal: true

module Invoices
  # Orchestrates the invoice extraction pipeline
  #
  # EXTRACTION PIPELINE:
  # 1. Try text extraction first (cheap, fast)
  # 2. Assess text quality - decide if OCR needed
  # 3. OCR only when necessary (scanned PDFs, images, poor quality text)
  # 4. Rules-based extraction (regex, heuristics)
  # 5. LLM only for ambiguity resolution (multiple candidates, low confidence)
  #
  # SOLID: Single Responsibility - Orchestrates extraction, delegates to specialized services
  class ExtractionService
    # Thresholds for decision making
    RULES_CONFIDENCE_THRESHOLD = 0.5  # Below this, consider LLM
    AMBIGUITY_THRESHOLD = 0.3         # Below this, definitely use LLM

    attr_reader :invoice

    def initialize(invoice, extractor: nil, parser: nil, validator: nil)
      @invoice = invoice
      @extractor = extractor
      @parser = parser
      @validator = validator
      @extraction_metadata = {}
    end

    def call
      return failure('Invoice not in pending state') unless invoice.can_extract?
      return failure('No file attached') unless invoice.file.attached?

      invoice.mark_processing!

      # Download and validate file
      file_content = download_file
      validate_file!(file_content, invoice.file.content_type)

      # STEP 1: Try text extraction first (fast, free)
      extraction_result = extract_text(file_content)
      @extraction_metadata[:text_extraction] = extraction_result.slice(:method, :quality, :quality_score)

      # STEP 2: Decide if OCR is needed
      text = extraction_result[:text]
      if extraction_result[:needs_ocr]
        ocr_result = try_ocr(file_content)
        if ocr_result[:text].present?
          text = ocr_result[:text]
          @extraction_metadata[:ocr_used] = true
          @extraction_metadata[:ocr_result] = ocr_result.slice(:method, :pages_processed, :error)
        else
          @extraction_metadata[:ocr_used] = false
          @extraction_metadata[:ocr_error] = ocr_result[:error]
        end
      end

      # Check if we have usable text
      if text.blank?
        invoice.mark_failed!('No readable text found in document. Document may be an image or scanned PDF requiring OCR.')
        return failure('No readable text found')
      end

      # STEP 3: Rules-based extraction
      rules_result = extract_with_rules(text)
      @extraction_metadata[:rules_extraction] = {
        confidence: rules_result[:confidence],
        fields_found: count_fields(rules_result)
      }

      # STEP 4: Decide if LLM is needed
      final_result = rules_result
      if should_use_llm?(rules_result)
        llm_result = try_llm_extraction(text, rules_result)
        if llm_result && !llm_result[:error]
          final_result = merge_results(rules_result, llm_result)
          @extraction_metadata[:llm_used] = true
        else
          @extraction_metadata[:llm_used] = false
          @extraction_metadata[:llm_error] = llm_result&.dig(:error)
        end
      else
        @extraction_metadata[:llm_used] = false
        @extraction_metadata[:llm_skipped_reason] = 'Rules extraction sufficient'
      end

      # STEP 5: Update invoice with extracted data
      update_invoice_with_results(final_result, text, extraction_result)

      success(invoice)
    rescue ActiveStorage::FileNotFoundError => e
      invoice.mark_failed!("File not found: #{e.message}")
      failure("File not found: #{e.message}")
    rescue StandardError => e
      Rails.logger.error("Invoice extraction failed for #{invoice.id}: #{e.message}")
      Rails.logger.error(e.backtrace.first(10).join("\n"))
      invoice.mark_failed!(e.message)
      failure(e.message)
    end

    private

    # ========================================
    # STEP 1: Text Extraction
    # ========================================

    def extract_text(file_content)
      extractor = PdfExtractor.new(file_content, filename: invoice.file.filename.to_s)
      extractor.extract
    end

    # ========================================
    # STEP 2: OCR (when needed)
    # ========================================

    def try_ocr(file_content)
      unless OcrService.available?
        Rails.logger.info("OCR not available - Tesseract not installed")
        return { text: '', error: 'OCR not available (Tesseract not installed)' }
      end

      ocr = OcrService.new(
        file_content,
        filename: invoice.file.filename.to_s,
        content_type: invoice.file.content_type
      )
      ocr.extract
    end

    # ========================================
    # STEP 3: Rules-based Extraction
    # ========================================

    def extract_with_rules(text)
      parser = FieldParser.new(text)
      parser.parse
    end

    # ========================================
    # STEP 4: LLM Fallback (for ambiguity)
    # ========================================

    def should_use_llm?(rules_result)
      # Don't use LLM if not available
      return false unless LlmExtractor.available?

      # Use LLM if confidence is very low
      return true if rules_result[:confidence].to_f < AMBIGUITY_THRESHOLD

      # Use LLM if amount is missing (critical field)
      return true if rules_result[:total_amount].nil?

      # Use LLM if confidence is moderate and vendor is unknown
      if rules_result[:confidence].to_f < RULES_CONFIDENCE_THRESHOLD
        return true if rules_result[:vendor_name].nil?
      end

      false
    end

    def try_llm_extraction(text, rules_result)
      # Build candidates from rules result
      candidates = build_candidates(rules_result)

      llm = LlmExtractor.new(text, candidates: candidates)
      llm.extract
    rescue StandardError => e
      Rails.logger.error("LLM extraction error: #{e.message}")
      { error: e.message }
    end

    def build_candidates(rules_result)
      candidates = {}

      # Add non-nil fields as candidates
      candidates[:total_amount] = [rules_result[:total_amount]] if rules_result[:total_amount]
      candidates[:vendor_name] = [rules_result[:vendor_name]] if rules_result[:vendor_name]
      candidates[:invoice_date] = [rules_result[:invoice_date]&.to_s] if rules_result[:invoice_date]
      candidates[:invoice_number] = [rules_result[:invoice_number]] if rules_result[:invoice_number]
      candidates[:vendor_gstin] = [rules_result[:vendor_gstin]] if rules_result[:vendor_gstin]

      candidates
    end

    def merge_results(rules_result, llm_result)
      merged = rules_result.dup

      # LLM results take precedence for nil or low-confidence fields
      %i[vendor_name invoice_number invoice_date total_amount vendor_gstin].each do |field|
        if merged[field].nil? && llm_result[field].present?
          merged[field] = llm_result[field]
        end
      end

      # Update confidence based on LLM
      if llm_result[:confidence]
        merged[:confidence] = [rules_result[:confidence].to_f, llm_result[:confidence].to_f].max
      end

      merged
    end

    # ========================================
    # STEP 5: Update Invoice
    # ========================================

    def update_invoice_with_results(result, text, extraction_result)
      # Build raw_data with extraction metadata
      raw_data = {
        text_excerpt: text[0..10_000],  # Store first 10k chars for debugging
        extraction_pipeline: @extraction_metadata,
        parsed_fields: result,
        quality_signals: extraction_result[:quality_signals]
      }

      invoice.mark_extracted!(
        vendor_name: result[:vendor_name],
        vendor_gstin: result[:vendor_gstin],
        invoice_number: result[:invoice_number],
        invoice_date: result[:invoice_date],
        total_amount: result[:total_amount],
        currency: result[:currency] || 'INR',
        raw_data: raw_data,
        method: determine_extraction_method,
        confidence: result[:confidence]
      )
    end

    def determine_extraction_method
      methods = []
      methods << 'pdf_text' if @extraction_metadata.dig(:text_extraction, :method) == 'pdf_text'
      methods << 'ocr' if @extraction_metadata[:ocr_used]
      methods << 'llm' if @extraction_metadata[:llm_used]
      methods << 'rules'  # Always used

      methods.join('+')
    end

    def count_fields(result)
      %i[vendor_name invoice_number invoice_date total_amount vendor_gstin].count do |field|
        result[field].present?
      end
    end

    # ========================================
    # Helpers
    # ========================================

    def download_file
      invoice.file.download
    end

    def validator
      @validator ||= FileValidator
    end

    def validate_file!(content, content_type)
      validator.new(content, content_type).validate!
    rescue FileValidator::InvalidFileTypeError, FileValidator::FileTooLargeError => e
      invoice.mark_failed!("File validation failed: #{e.message}")
      raise
    end

    def success(invoice)
      { success: true, invoice: invoice, metadata: @extraction_metadata }
    end

    def failure(error)
      { success: false, error: error, metadata: @extraction_metadata }
    end
  end
end
