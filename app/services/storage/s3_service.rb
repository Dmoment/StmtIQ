# frozen_string_literal: true

module Storage
  class S3Service
    attr_reader :client, :bucket

    def initialize
      @client = Aws::S3::Client.new
      @bucket = ENV.fetch('AWS_BUCKET', "stmtiq-#{Rails.env}")
    end

    # Upload a file to S3
    # Returns the S3 key
    def upload(file, key:, content_type: nil)
      content_type ||= Marcel::MimeType.for(file)

      client.put_object(
        bucket: bucket,
        key: key,
        body: file,
        content_type: content_type
      )

      key
    end

    # Upload large file with multipart upload
    # Better for files > 100MB
    def upload_multipart(file_path, key:, content_type: nil)
      s3_resource = Aws::S3::Resource.new(client: client)
      obj = s3_resource.bucket(bucket).object(key)

      obj.upload_file(file_path, {
        content_type: content_type,
        multipart_threshold: 25.megabytes
      })

      key
    end

    # Download file to a local tempfile
    def download_to_tempfile(key, &block)
      tempfile = Tempfile.new(['s3_download', File.extname(key)])
      tempfile.binmode

      client.get_object(
        bucket: bucket,
        key: key,
        response_target: tempfile.path
      )

      tempfile.rewind

      if block_given?
        begin
          yield tempfile
        ensure
          tempfile.close
          tempfile.unlink
        end
      else
        tempfile
      end
    end

    # Stream file content (for large files)
    # Yields chunks of data
    def stream(key, chunk_size: 1.megabyte, &block)
      head = client.head_object(bucket: bucket, key: key)
      file_size = head.content_length

      offset = 0
      while offset < file_size
        range_end = [offset + chunk_size - 1, file_size - 1].min

        response = client.get_object(
          bucket: bucket,
          key: key,
          range: "bytes=#{offset}-#{range_end}"
        )

        yield response.body.read

        offset = range_end + 1
      end
    end

    # Get a presigned URL for direct browser upload
    def presigned_upload_url(key, expires_in: 1.hour, content_type: nil)
      signer = Aws::S3::Presigner.new(client: client)

      params = {
        bucket: bucket,
        key: key,
        expires_in: expires_in.to_i
      }
      params[:content_type] = content_type if content_type

      signer.presigned_url(:put_object, params)
    end

    # Get a presigned URL for download
    def presigned_download_url(key, expires_in: 1.hour, filename: nil)
      signer = Aws::S3::Presigner.new(client: client)

      params = {
        bucket: bucket,
        key: key,
        expires_in: expires_in.to_i
      }

      if filename
        params[:response_content_disposition] = "attachment; filename=\"#{filename}\""
      end

      signer.presigned_url(:get_object, params)
    end

    # Delete a file from S3
    def delete(key)
      client.delete_object(bucket: bucket, key: key)
    end

    # Check if file exists
    def exists?(key)
      client.head_object(bucket: bucket, key: key)
      true
    rescue Aws::S3::Errors::NotFound
      false
    end

    # Get file metadata
    def metadata(key)
      response = client.head_object(bucket: bucket, key: key)
      {
        content_type: response.content_type,
        content_length: response.content_length,
        last_modified: response.last_modified,
        etag: response.etag
      }
    rescue Aws::S3::Errors::NotFound
      nil
    end

    # Generate a unique key for statement files
    def self.statement_key(user_id:, statement_id:, filename:)
      ext = File.extname(filename)
      "statements/#{user_id}/#{statement_id}/original#{ext}"
    end
  end
end
