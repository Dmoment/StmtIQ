# frozen_string_literal: true

module Invoices
  class ExtractionService
    attr_reader :invoice

    # SOLID: Dependency Inversion - Inject extractors
    def initialize(invoice, extractor: nil, parser: nil, validator: nil)
      @invoice = invoice
      @extractor = extractor
      @parser = parser
      @validator = validator
    end

    def call
      return failure('Invoice not in pending state') unless invoice.can_extract?
      return failure('No file attached') unless invoice.file.attached?

      invoice.mark_processing!

      # Download file content
      file_content = download_file
      filename = invoice.file.filename.to_s

      # Security: Validate file before processing
      validate_file!(file_content, invoice.file.content_type)

      # Extract text from file
      extraction_result = extractor.extract

      if extraction_result[:error] && !extraction_result[:needs_ocr]
        invoice.mark_failed!(extraction_result[:error])
        return failure(extraction_result[:error])
      end

      # If no text found and needs OCR, we'll handle that separately
      if extraction_result[:needs_ocr] && extraction_result[:text].blank?
        # For now, mark as failed with a message that OCR is needed
        # In future, we can integrate AWS Textract or similar
        invoice.mark_failed!('No text found in document. OCR support coming soon.')
        return failure('Document requires OCR which is not yet implemented')
      end

      # Parse structured fields from text
      parsed = parser.parse

      # Update invoice with extracted data
      invoice.mark_extracted!(
        vendor_name: parsed[:vendor_name],
        vendor_gstin: parsed[:vendor_gstin],
        invoice_number: parsed[:invoice_number],
        invoice_date: parsed[:invoice_date],
        total_amount: parsed[:total_amount],
        currency: parsed[:currency],
        raw_data: extraction_result.merge(parsed_fields: parsed),
        method: extraction_result[:method],
        confidence: parsed[:confidence]
      )

      success(invoice)
    rescue ActiveStorage::FileNotFoundError => e
      invoice.mark_failed!("File not found: #{e.message}")
      failure("File not found: #{e.message}")
    rescue => e
      Rails.logger.error("Invoice extraction failed for #{invoice.id}: #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      invoice.mark_failed!(e.message)
      failure(e.message)
    end

    private

    def download_file
      invoice.file.download
    end

    def extractor
      @extractor ||= PdfExtractor.new(download_file, filename: invoice.file.filename.to_s)
    end

    def parser
      @parser ||= FieldParser.new(extractor.extract[:text])
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
      { success: true, invoice: invoice }
    end

    def failure(error)
      { success: false, error: error }
    end
  end
end
