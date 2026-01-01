# frozen_string_literal: true

module V1
  module Entities
    class PresignedUpload < Grape::Entity
      expose :upload_url, documentation: { type: String, desc: 'Presigned S3 URL for direct upload' }
      expose :s3_key, documentation: { type: String, desc: 'S3 object key for the upload' }
      expose :expires_in, documentation: { type: Integer, desc: 'URL expiration time in seconds' }
      expose :method, documentation: { type: String, desc: 'HTTP method to use (PUT)' }
      expose :headers, documentation: { type: Hash, desc: 'Headers to include in the upload request' }
    end
  end
end
