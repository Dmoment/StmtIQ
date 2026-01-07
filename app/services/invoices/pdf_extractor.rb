# frozen_string_literal: true

module Invoices
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
        # For images, we'll need OCR - return empty for now
        { text: '', method: 'image', has_text: false, needs_ocr: true }
      else
        { text: '', method: 'unknown', has_text: false, error: 'Unsupported file type' }
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
        file_content.start_with?("GIF")            # GIF
    end

    def extract_from_pdf
      reader = PDF::Reader.new(StringIO.new(file_content))
      text = reader.pages.map(&:text).join("\n")

      {
        text: text,
        method: 'pdf_text',
        page_count: reader.page_count,
        has_text: text.strip.present?,
        needs_ocr: text.strip.blank?
      }
    rescue PDF::Reader::MalformedPDFError => e
      { text: '', method: 'pdf_text', error: "Malformed PDF: #{e.message}", has_text: false }
    rescue PDF::Reader::UnsupportedFeatureError => e
      { text: '', method: 'pdf_text', error: "Unsupported PDF feature: #{e.message}", has_text: false, needs_ocr: true }
    rescue => e
      { text: '', method: 'pdf_text', error: e.message, has_text: false }
    end
  end
end
