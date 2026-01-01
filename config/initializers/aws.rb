# frozen_string_literal: true

# AWS S3 Configuration
#
# Required environment variables:
#   AWS_ACCESS_KEY_ID     - Your AWS access key
#   AWS_SECRET_ACCESS_KEY - Your AWS secret key
#   AWS_REGION            - AWS region (default: ap-south-1)
#   AWS_BUCKET            - S3 bucket name (default: stmtiq-{env})
#
# For development, you can use LocalStack or MinIO as S3-compatible storage

require 'aws-sdk-s3'

Aws.config.update({
  region: ENV.fetch('AWS_REGION', 'ap-south-1'),
  credentials: Aws::Credentials.new(
    ENV['AWS_ACCESS_KEY_ID'],
    ENV['AWS_SECRET_ACCESS_KEY']
  )
}) if ENV['AWS_ACCESS_KEY_ID'].present?
