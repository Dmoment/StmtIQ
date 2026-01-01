# frozen_string_literal: true

module Uploads
  # ConfirmUploadService - Confirms a direct S3 upload and creates a statement
  #
  # After the browser uploads a file directly to S3 using a presigned URL,
  # this service verifies the upload, creates a Statement record, and
  # triggers parsing.
  #
  # Usage:
  #   service = Uploads::ConfirmUploadService.new(
  #     user: current_user,
  #     s3_key: "uploads/123/1234567890_statement.xlsx",
  #     filename: "statement.xlsx",
  #     template_id: 1,
  #     account_id: 2 # optional
  #   )
  #   statement = service.call
  #
  class ConfirmUploadService
    attr_reader :user, :s3_key, :filename, :template_id, :account_id

    def initialize(user:, s3_key:, filename:, template_id:, account_id: nil)
      @user = user
      @s3_key = s3_key
      @filename = filename
      @template_id = template_id
      @account_id = account_id
    end

    def call
      validate_upload_exists!
      validate_file_format!

      statement = create_statement!
      attach_file_to_statement!(statement)
      cleanup_temp_upload!
      enqueue_parsing_job!(statement)

      statement
    end

    private

    def validate_upload_exists!
      unless s3_service.exists?(s3_key)
        raise UploadNotFoundError, 'File not found in S3. Upload may have failed.'
      end
    end

    def validate_file_format!
      unless file_extension == template.file_format
        raise FileFormatMismatchError,
              "File format mismatch. Expected #{template.file_format.upcase}, got #{file_extension.upcase}"
      end
    end

    def create_statement!
      user.statements.create!(
        file_name: filename,
        file_type: file_extension,
        account_id: account_id,
        bank_template_id: template.id,
        status: 'pending',
        metadata: {
          s3_key: s3_key,
          file_size: s3_metadata[:content_length],
          upload_method: 'direct_s3',
          uploaded_at: Time.current.iso8601
        }
      )
    end

    def attach_file_to_statement!(statement)
      s3_service.download_to_tempfile(s3_key) do |tempfile|
        statement.file.attach(
          io: tempfile,
          filename: filename,
          content_type: s3_metadata[:content_type]
        )
      end
    end

    def cleanup_temp_upload!
      s3_service.delete(s3_key)
    end

    def enqueue_parsing_job!(statement)
      StatementParserJob.perform_later(statement.id)
    end

    def file_extension
      @file_extension ||= File.extname(filename).delete('.').downcase
    end

    def template
      @template ||= BankTemplate.find(template_id)
    end

    def s3_metadata
      @s3_metadata ||= s3_service.metadata(s3_key)
    end

    def s3_service
      @s3_service ||= Storage::S3Service.new
    end

    # Custom errors
    class UploadNotFoundError < StandardError; end
    class FileFormatMismatchError < StandardError; end
  end
end
