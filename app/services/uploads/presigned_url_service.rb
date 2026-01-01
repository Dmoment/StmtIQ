# frozen_string_literal: true

module Uploads
  # PresignedUrlService - Generates presigned S3 URLs for direct browser uploads
  #
  # Usage:
  #   service = Uploads::PresignedUrlService.new(
  #     user_id: current_user.id,
  #     filename: 'statement.xlsx',
  #     content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  #   )
  #   result = service.call
  #   # => { upload_url: "https://...", s3_key: "uploads/123/...", ... }
  #
  class PresignedUrlService
    ALLOWED_EXTENSIONS = %w[csv xlsx xls pdf].freeze
    URL_EXPIRATION = 1.hour
    EXPIRATION_SECONDS = 3600

    attr_reader :user_id, :filename, :content_type, :file_size

    def initialize(user_id:, filename:, content_type:, file_size: nil)
      @user_id = user_id
      @filename = filename
      @content_type = content_type
      @file_size = file_size
    end

    def call
      validate_file_type!

      OpenStruct.new(
        upload_url: presigned_url,
        s3_key: s3_key,
        expires_in: EXPIRATION_SECONDS,
        method: 'PUT',
        headers: { 'Content-Type' => content_type }
      )
    end

    private

    def validate_file_type!
      unless ALLOWED_EXTENSIONS.include?(extension)
        raise InvalidFileTypeError, "Unsupported file type: #{extension}. Allowed: #{ALLOWED_EXTENSIONS.join(', ')}"
      end
    end

    def extension
      @extension ||= File.extname(filename).delete('.').downcase
    end

    def s3_key
      @s3_key ||= begin
        timestamp = Time.current.to_i
        safe_filename = filename.gsub(/[^a-zA-Z0-9._-]/, '_')
        "uploads/#{user_id}/#{timestamp}_#{safe_filename}"
      end
    end

    def presigned_url
      @presigned_url ||= s3_service.presigned_upload_url(
        s3_key,
        expires_in: URL_EXPIRATION,
        content_type: content_type
      )
    end

    def s3_service
      @s3_service ||= Storage::S3Service.new
    end

    # Custom error for invalid file types
    class InvalidFileTypeError < StandardError; end
  end
end
