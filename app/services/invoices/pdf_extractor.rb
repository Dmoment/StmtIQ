# frozen_string_literal: true

module Invoices
  # Extracts text from PDF files using PDF::Reader
  # Includes quality assessment to determine if OCR is needed
  # SOLID: Single Responsibility - Only handles PDF text extraction
  class PdfExtractor
    attr_reader :file_content, :filename

    def initialize(file_content, filename: nil)
      @file_content = file_content
      @filename = filename
    end

    def extract
      if pdf_file?
        extract_from_pdf
      elsif image_file?
        # For images, we'll need OCR - return indicator
        {
          text: '',
          method: 'image',
          has_text: false,
          needs_ocr: true,
          quality: :none,
          reason: 'Image files require OCR'
        }
      else
        {
          text: '',
          method: 'unknown',
          has_text: false,
          error: 'Unsupported file type'
        }
      end
    end

    private

    def pdf_file?
      return true if filename&.downcase&.end_with?('.pdf')

      # Check PDF magic bytes
      file_content.start_with?('%PDF')
    end

    def image_file?
      return true if filename&.downcase&.match?(/\.(png|jpg|jpeg|gif|webp)$/)

      # Check image magic bytes
      file_content.start_with?("\xFF\xD8\xFF") || # JPEG
        file_content.start_with?("\x89PNG") ||     # PNG
        file_content.start_with?('GIF')            # GIF
    end

    def extract_from_pdf
      reader = PDF::Reader.new(StringIO.new(file_content))
      text = extract_text_from_pages(reader)

      # Analyze text quality
      quality_analysis = TextQualityAnalyzer.new(text).analyze

      {
        text: text,
        method: 'pdf_text',
        page_count: reader.page_count,
        has_text: text.strip.present?,
        needs_ocr: quality_analysis[:needs_ocr],
        quality: quality_analysis[:quality],
        quality_score: quality_analysis[:score],
        quality_signals: quality_analysis[:signals],
        recommendation: quality_analysis[:recommendation]
      }
    rescue PDF::Reader::MalformedPDFError => e
      {
        text: '',
        method: 'pdf_text',
        error: "Malformed PDF: #{e.message}",
        has_text: false,
        needs_ocr: true,
        quality: :error,
        reason: 'PDF is malformed or corrupted'
      }
    rescue PDF::Reader::UnsupportedFeatureError => e
      {
        text: '',
        method: 'pdf_text',
        error: "Unsupported PDF feature: #{e.message}",
        has_text: false,
        needs_ocr: true,
        quality: :error,
        reason: 'PDF uses unsupported features'
      }
    rescue StandardError => e
      {
        text: '',
        method: 'pdf_text',
        error: e.message,
        has_text: false,
        needs_ocr: true,
        quality: :error,
        reason: "Extraction error: #{e.message}"
      }
    end

    def extract_text_from_pages(reader)
      texts = []

      reader.pages.each_with_index do |page, index|
        page_text = extract_page_text(page)
        texts << page_text if page_text.present?
      rescue StandardError => e
        Rails.logger.warn("Failed to extract text from page #{index + 1}: #{e.message}")
        next
      end

      texts.join("\n\n")
    end

    def extract_page_text(page)
      text = page.text

      # Clean up common PDF text issues
      text = clean_pdf_text(text)

      text
    end

    # Clean up common PDF text extraction issues
    def clean_pdf_text(text)
      return '' if text.nil?

      text
        .gsub(/\r\n?/, "\n")           # Normalize line endings
        .gsub(/\f/, "\n")              # Form feeds to newlines
        .gsub(/\t/, ' ')               # Tabs to spaces
        .gsub(/[ ]{2,}/, ' ')          # Multiple spaces to single
        .gsub(/\n{3,}/, "\n\n")        # Multiple blank lines to double
        .gsub(/([a-z])([A-Z])/, '\1 \2')  # Add space between camelCase words (common PDF issue)
        .gsub(/(\d)([A-Za-z])/, '\1 \2')  # Add space between number and letter
        .gsub(/([A-Za-z])(\d)/, '\1 \2')  # Add space between letter and number
        .strip
    end
  end
end
