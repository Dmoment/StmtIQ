# frozen_string_literal: true

module Invoices
  # Security: Validates uploaded invoice files for type, size, and content
  class FileValidator
    MAX_FILE_SIZE = 10.megabytes
    ALLOWED_CONTENT_TYPES = %w[
      application/pdf
      image/png
      image/jpeg
      image/jpg
    ].freeze

    # Magic bytes for file type validation (prevents extension spoofing)
    MAGIC_BYTES = {
      'application/pdf' => ['%PDF'],
      'image/png' => ["\x89PNG".b],
      'image/jpeg' => ["\xFF\xD8\xFF".b],
      'image/jpg' => ["\xFF\xD8\xFF".b]
    }.freeze

    class InvalidFileTypeError < StandardError; end
    class FileTooLargeError < StandardError; end
    class MaliciousContentError < StandardError; end

    def initialize(file_content, content_type, file_size = nil)
      @file_content = file_content
      @content_type = content_type
      @file_size = file_size || file_content.bytesize
    end

    def validate!
      validate_size!
      validate_content_type!
      validate_magic_bytes!
      validate_not_malicious!
      true
    end

    private

    def validate_size!
      return if @file_size <= MAX_FILE_SIZE

      raise FileTooLargeError, "File size #{@file_size} exceeds maximum #{MAX_FILE_SIZE} bytes"
    end

    def validate_content_type!
      return if ALLOWED_CONTENT_TYPES.include?(@content_type)

      raise InvalidFileTypeError, "Content type #{@content_type} not allowed"
    end

    def validate_magic_bytes!
      expected_magic_bytes = MAGIC_BYTES[@content_type]
      return unless expected_magic_bytes

      actual_start = @file_content[0, 10]

      magic_match = expected_magic_bytes.any? do |magic|
        actual_start.start_with?(magic)
      end

      return if magic_match

      raise InvalidFileTypeError, "File content does not match declared type #{@content_type}"
    end

    def validate_not_malicious!
      # Check for script injection attempts in PDFs
      if @content_type == 'application/pdf'
        dangerous_patterns = ['/JavaScript', '/JS', '/AA', '/OpenAction', '/Launch']
        dangerous_patterns.each do |pattern|
          if @file_content.include?(pattern)
            Rails.logger.warn("Potentially malicious PDF detected with pattern: #{pattern}")
            # For now, just log. In production, might want to reject.
          end
        end
      end
    end
  end
end
