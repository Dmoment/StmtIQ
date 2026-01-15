# frozen_string_literal: true

module Workflows
  module Steps
    class OrganizeByMonthStep < BaseStep
      def self.display_name
        'Organize by Month'
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
            month: {
              type: 'string',
              title: 'Month',
              description: 'Which month to organize',
              enum: %w[current previous specific],
              default: 'previous'
            },
            specific_month: {
              type: 'integer',
              title: 'Specific Month',
              description: 'Month number (1-12) if "specific" is selected',
              minimum: 1,
              maximum: 12
            },
            specific_year: {
              type: 'integer',
              title: 'Specific Year',
              description: 'Year if "specific" is selected',
              minimum: 2020,
              maximum: 2100
            },
            include_types: {
              type: 'array',
              title: 'Document Types to Include',
              description: 'Types of documents to organize',
              items: {
                type: 'string',
                enum: %w[invoice bank_statement receipt document all]
              },
              default: ['all']
            },
            bucket_name_template: {
              type: 'string',
              title: 'Bucket Name Template',
              description: 'Name pattern for the bucket. Use {{month}} and {{year}}.',
              default: '{{month_name}} {{year}}'
            }
          },
          required: %w[month]
        }
      end

      def execute
        target_date = determine_target_date
        month = target_date.month
        year = target_date.year
        month_name = target_date.strftime('%B')

        # Find or create the monthly bucket
        bucket = find_or_create_bucket(month, year, month_name)

        # Get documents to organize based on config
        include_types = config[:include_types] || ['all']
        documents_organized = 0

        if defined?(Document) && include_types.include?('all') || include_types.include?('document')
          documents_organized += organize_documents(bucket, target_date)
        end

        if defined?(Invoice) && (include_types.include?('all') || include_types.include?('invoice'))
          documents_organized += organize_invoices(bucket, target_date)
        end

        log_info("Organized #{documents_organized} items into bucket '#{bucket.name}'")

        add_to_context(:current_bucket, {
          id: bucket.id,
          name: bucket.name,
          month: month,
          year: year,
          documents_count: documents_organized
        })

        {
          bucket_id: bucket.id,
          bucket_name: bucket.name,
          month: month,
          year: year,
          documents_organized: documents_organized
        }
      end

      private

      def determine_target_date
        case config[:month]
        when 'current'
          Date.current
        when 'previous'
          Date.current.prev_month
        when 'specific'
          Date.new(
            config[:specific_year] || Date.current.year,
            config[:specific_month] || Date.current.month,
            1
          )
        else
          Date.current.prev_month
        end
      end

      def find_or_create_bucket(month, year, month_name)
        return create_virtual_bucket(month, year, month_name) unless defined?(Bucket)

        name_template = config[:bucket_name_template] || '{{month_name}} {{year}}'
        bucket_name = name_template
                      .gsub('{{month_name}}', month_name)
                      .gsub('{{month}}', month.to_s.rjust(2, '0'))
                      .gsub('{{year}}', year.to_s)

        workspace.buckets.find_or_create_by!(
          bucket_type: 'monthly',
          month: month,
          year: year
        ) do |b|
          b.name = bucket_name
        end
      end

      def create_virtual_bucket(month, year, month_name)
        # Return a struct if Bucket model doesn't exist
        OpenStruct.new(
          id: "virtual_#{month}_#{year}",
          name: "#{month_name} #{year}",
          month: month,
          year: year
        )
      end

      def organize_documents(bucket, target_date)
        return 0 unless defined?(Document)

        start_date = target_date.beginning_of_month
        end_date = target_date.end_of_month

        documents = workspace.documents
                             .where(created_at: start_date..end_date)
                             .where(bucket_id: nil)

        count = documents.count
        documents.update_all(bucket_id: bucket.id) if bucket.respond_to?(:id) && bucket.id.is_a?(Integer)

        count
      end

      def organize_invoices(bucket, target_date)
        return 0 unless defined?(Invoice)

        start_date = target_date.beginning_of_month
        end_date = target_date.end_of_month

        # Organize invoices from that month that aren't already in a bucket
        invoices = workspace.invoices
                            .where(invoice_date: start_date..end_date)

        # If invoices have bucket association
        if Invoice.column_names.include?('bucket_id')
          invoices = invoices.where(bucket_id: nil)
          count = invoices.count
          invoices.update_all(bucket_id: bucket.id) if bucket.respond_to?(:id) && bucket.id.is_a?(Integer)
          count
        else
          invoices.count
        end
      end
    end
  end
end
