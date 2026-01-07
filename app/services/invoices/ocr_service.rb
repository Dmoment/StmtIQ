# frozen_string_literal: true

module Invoices
  # OCR service for scanned PDFs and images
  # Uses system Tesseract OCR (must be installed: brew install tesseract)
  # SOLID: Single Responsibility - Only handles OCR text extraction
  class OcrService
    class OcrNotAvailableError < StandardError; end
    class OcrProcessingError < StandardError; end

    # Languages to use for OCR (English + Hindi for Indian invoices)
    LANGUAGES = 'eng+hin'

    # Max pages to OCR (first 2 pages usually have all invoice details)
    MAX_PAGES = 2

    # Temp file prefix
    TEMP_PREFIX = 'invoice_ocr'

    attr_reader :file_content, :filename, :content_type

    def initialize(file_content, filename: nil, content_type: nil)
      @file_content = file_content
      @filename = filename
      @content_type = content_type || detect_content_type
    end

    # Main OCR entry point
    def extract
      validate_tesseract_available!

      result = if pdf?
                 ocr_pdf
               elsif image?
                 ocr_image
               else
                 { text: '', error: 'Unsupported file type for OCR' }
               end

      result.merge(
        method: 'ocr',
        ocr_engine: 'tesseract'
      )
    rescue OcrNotAvailableError => e
      { text: '', method: 'ocr', error: e.message, ocr_available: false }
    rescue OcrProcessingError => e
      { text: '', method: 'ocr', error: e.message }
    rescue StandardError => e
      Rails.logger.error("OCR failed: #{e.message}")
      { text: '', method: 'ocr', error: "OCR processing failed: #{e.message}" }
    end

    # Check if Tesseract is available on the system
    def self.available?
      system('which tesseract > /dev/null 2>&1')
    end

    private

    def validate_tesseract_available!
      unless self.class.available?
        raise OcrNotAvailableError, 'Tesseract OCR is not installed. Install with: brew install tesseract'
      end
    end

    def pdf?
      content_type == 'application/pdf' ||
        filename&.downcase&.end_with?('.pdf') ||
        file_content.start_with?('%PDF')
    end

    def image?
      %w[image/png image/jpeg image/jpg image/gif image/webp].include?(content_type) ||
        filename&.downcase&.match?(/\.(png|jpg|jpeg|gif|webp)$/)
    end

    def detect_content_type
      if file_content.start_with?('%PDF')
        'application/pdf'
      elsif file_content.start_with?("\xFF\xD8\xFF")
        'image/jpeg'
      elsif file_content.start_with?("\x89PNG")
        'image/png'
      elsif file_content.start_with?('GIF')
        'image/gif'
      else
        'application/octet-stream'
      end
    end

    def ocr_pdf
      texts = []
      page_count = 0

      Dir.mktmpdir(TEMP_PREFIX) do |tmpdir|
        pdf_path = File.join(tmpdir, 'input.pdf')
        File.binwrite(pdf_path, file_content)

        # Convert PDF pages to images using pdftoppm (part of poppler)
        # If not available, try ImageMagick convert
        image_paths = convert_pdf_to_images(pdf_path, tmpdir)

        if image_paths.empty?
          return { text: '', error: 'Failed to convert PDF to images. Install poppler-utils.' }
        end

        # OCR each page (up to MAX_PAGES)
        image_paths.first(MAX_PAGES).each_with_index do |image_path, index|
          page_text = run_tesseract(image_path)
          texts << page_text unless page_text.empty?
          page_count += 1
        end
      end

      {
        text: texts.join("\n\n--- Page Break ---\n\n"),
        pages_processed: page_count,
        total_pages: page_count
      }
    end

    def ocr_image
      Dir.mktmpdir(TEMP_PREFIX) do |tmpdir|
        # Determine extension from content type
        ext = case content_type
              when 'image/png' then '.png'
              when 'image/gif' then '.gif'
              else '.jpg'
              end

        image_path = File.join(tmpdir, "input#{ext}")
        File.binwrite(image_path, file_content)

        text = run_tesseract(image_path)

        {
          text: text,
          pages_processed: 1,
          total_pages: 1
        }
      end
    end

    def convert_pdf_to_images(pdf_path, output_dir)
      image_prefix = File.join(output_dir, 'page')

      # Try pdftoppm first (faster, better quality)
      if system('which pdftoppm > /dev/null 2>&1')
        system("pdftoppm -png -r 300 '#{pdf_path}' '#{image_prefix}'")
      # Fallback to ImageMagick convert
      elsif system('which convert > /dev/null 2>&1')
        system("convert -density 300 '#{pdf_path}' '#{image_prefix}-%d.png'")
      else
        Rails.logger.warn('Neither pdftoppm nor ImageMagick convert available for PDF to image conversion')
        return []
      end

      # Find generated images
      Dir.glob("#{image_prefix}*.png").sort
    end

    def run_tesseract(image_path)
      output_base = image_path.sub(/\.[^.]+$/, '')

      # Run tesseract with PSM 3 (fully automatic page segmentation)
      # --oem 3 uses LSTM OCR engine (best accuracy)
      cmd = "tesseract '#{image_path}' '#{output_base}' -l #{LANGUAGES} --oem 3 --psm 3 2>/dev/null"

      success = system(cmd)

      unless success
        # Retry with just English if multilingual fails
        cmd_fallback = "tesseract '#{image_path}' '#{output_base}' -l eng --oem 3 --psm 3 2>/dev/null"
        system(cmd_fallback)
      end

      output_file = "#{output_base}.txt"

      if File.exist?(output_file)
        text = File.read(output_file)
        clean_ocr_text(text)
      else
        ''
      end
    end

    # Clean up common OCR artifacts
    def clean_ocr_text(text)
      text
        .gsub(/\f/, "\n")           # Replace form feeds with newlines
        .gsub(/\r\n?/, "\n")        # Normalize line endings
        .gsub(/[ \t]+/, ' ')        # Collapse multiple spaces
        .gsub(/\n{3,}/, "\n\n")     # Collapse multiple blank lines
        .gsub(/[^\x20-\x7E\n₹]/u) { |c| c.match?(/\p{L}/) ? c : '' }  # Keep letters, basic ASCII, newlines, ₹
        .strip
    end
  end
end
