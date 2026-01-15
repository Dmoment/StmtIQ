# frozen_string_literal: true

module Workflows
  module Steps
    class CreateBucketStep < BaseStep
      def self.display_name
        'Create Bucket'
      end

      def self.category
        :document
      end

      def self.icon
        'folder'
      end

      def self.description
        'Create a monthly bucket and organize documents into it'
      end

      def self.config_schema
        {
          type: 'object',
          properties: {
            bucket_type: {
              type: 'string',
              title: 'Bucket Type',
              description: 'How to name the bucket',
              enum: %w[previous_month current_month custom],
              default: 'previous_month'
            },
            custom_name: {
              type: 'string',
              title: 'Custom Name',
              description: 'Custom bucket name (only if bucket_type is custom)'
            },
            include_gmail_docs: {
              type: 'boolean',
              title: 'Include Gmail Documents',
              description: 'Add documents fetched from Gmail to this bucket',
              default: true
            },
            auto_categorize: {
              type: 'boolean',
              title: 'Auto-categorize Documents',
              description: 'Automatically organize documents by type',
              default: true
            }
          },
          required: []
        }
      end

      def execute
        bucket_name = determine_bucket_name

        log_info("Creating bucket: #{bucket_name}")

        # Find or create the bucket
        bucket = find_or_create_bucket(bucket_name)

        return failure_result("Failed to create bucket: #{bucket_name}") unless bucket

        # Add documents from Gmail sync if enabled
        docs_added = 0
        if config[:include_gmail_docs]
          docs_added = add_gmail_documents_to_bucket(bucket)
        end

        # Store bucket info in context for subsequent steps
        add_to_context(:bucket, {
          id: bucket.id,
          name: bucket.name,
          month: bucket_name,
          documents_added: docs_added
        })

        {
          success: true,
          bucket_id: bucket.id,
          bucket_name: bucket.name,
          documents_added: docs_added,
          message: "Bucket '#{bucket_name}' created with #{docs_added} documents"
        }
      rescue StandardError => e
        log_error("Create bucket failed: #{e.message}")
        failure_result("Failed to create bucket: #{e.message}")
      end

      private

      def determine_bucket_name
        case config[:bucket_type]
        when 'previous_month'
          # Use date range from previous step if available
          date_range = from_context(:date_range)
          if date_range && date_range[:month_name]
            date_range[:month_name]
          else
            Date.current.prev_month.strftime('%B %Y')
          end
        when 'current_month'
          Date.current.strftime('%B %Y')
        when 'custom'
          config[:custom_name] || 'Untitled Bucket'
        else
          Date.current.prev_month.strftime('%B %Y')
        end
      end

      def find_or_create_bucket(name)
        # Try to find existing bucket with same name
        if defined?(Bucket)
          bucket = workspace.buckets.find_by(name: name)
          return bucket if bucket

          # Create new bucket
          workspace.buckets.create!(
            name: name,
            user: user,
            description: "Auto-created by workflow on #{Date.current}",
            status: 'active'
          )
        else
          # Fallback if Bucket model doesn't exist
          log_info("Bucket model not found, simulating bucket creation")
          OpenStruct.new(id: SecureRandom.uuid, name: name)
        end
      end

      def add_gmail_documents_to_bucket(bucket)
        return 0 unless defined?(Document)

        gmail_sync = from_context(:gmail_sync)
        return 0 unless gmail_sync

        # Find recent documents from Gmail sync
        recent_docs = workspace.documents
                               .where(source: 'gmail')
                               .where('created_at > ?', 1.hour.ago)
                               .where(bucket_id: nil)

        count = 0
        recent_docs.find_each do |doc|
          doc.update(bucket_id: bucket.id)
          count += 1

          # Auto-categorize if enabled
          if config[:auto_categorize] && defined?(DocumentCategorizerService)
            DocumentCategorizerService.new(doc).categorize
          end
        end

        log_info("Added #{count} Gmail documents to bucket")
        count
      end
    end
  end
end
