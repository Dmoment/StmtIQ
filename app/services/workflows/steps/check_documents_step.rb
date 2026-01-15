# frozen_string_literal: true

module Workflows
  module Steps
    class CheckDocumentsStep < BaseStep
      def self.display_name
        'Check Documents'
      end

      def self.category
        :document
      end

      def self.icon
        'clipboard-check'
      end

      def self.description
        'Verify all required documents are present and parse bank statements'
      end

      def self.config_schema
        {
          type: 'object',
          properties: {
            required_documents: {
              type: 'array',
              title: 'Required Documents',
              description: 'Types of documents that must be present',
              items: { type: 'string' },
              default: %w[bank_statement invoices]
            },
            parse_statements: {
              type: 'boolean',
              title: 'Parse Bank Statements',
              description: 'Automatically parse and extract transactions from bank statements',
              default: true
            },
            notify_on_missing: {
              type: 'boolean',
              title: 'Notify on Missing',
              description: 'Send notification when documents are missing',
              default: true
            },
            missing_doc_action: {
              type: 'string',
              title: 'Missing Document Action',
              description: 'What to do when documents are missing',
              enum: %w[notify pause continue],
              default: 'notify'
            }
          },
          required: []
        }
      end

      def execute
        bucket_info = from_context(:bucket)
        return failure_result('No bucket found in context') unless bucket_info

        required_docs = config[:required_documents] || %w[bank_statement invoices]

        log_info("Checking for required documents: #{required_docs.join(', ')}")

        results = {
          present: [],
          missing: [],
          parsed: 0
        }

        required_docs.each do |doc_type|
          documents = find_documents_by_type(doc_type, bucket_info[:id])

          if documents.any?
            results[:present] << {
              type: doc_type,
              count: documents.size
            }

            # Parse bank statements if enabled
            if config[:parse_statements] && doc_type == 'bank_statement'
              parsed_count = parse_bank_statements(documents)
              results[:parsed] += parsed_count
            end
          else
            results[:missing] << doc_type
          end
        end

        # Handle missing documents based on config
        if results[:missing].any?
          handle_missing_documents(results[:missing])

          if config[:missing_doc_action] == 'pause'
            add_to_context(:workflow_paused, true)
            add_to_context(:pause_reason, "Missing documents: #{results[:missing].join(', ')}")
          end
        end

        add_to_context(:document_check, results)

        {
          success: results[:missing].empty? || config[:missing_doc_action] != 'pause',
          present_count: results[:present].size,
          missing_count: results[:missing].size,
          parsed_count: results[:parsed],
          missing_types: results[:missing],
          message: build_result_message(results)
        }
      rescue StandardError => e
        log_error("Check documents failed: #{e.message}")
        failure_result("Failed to check documents: #{e.message}")
      end

      private

      def find_documents_by_type(doc_type, bucket_id)
        return [] unless defined?(Document)

        # Map doc_type to document attributes
        type_mapping = {
          'bank_statement' => { document_type: %w[bank_statement statement] },
          'firc' => { document_type: %w[firc foreign_inward_remittance] },
          'invoices' => { document_type: %w[invoice receipt] },
          'gst_returns' => { document_type: %w[gst_return gstr] },
          'tds_certificates' => { document_type: %w[tds_certificate form_16] },
          'rent_agreements' => { document_type: %w[rent_agreement lease] }
        }

        conditions = type_mapping[doc_type] || { document_type: doc_type }

        workspace.documents
                 .where(bucket_id: bucket_id)
                 .where(conditions)
      end

      def parse_bank_statements(documents)
        return 0 unless defined?(StatementParserJob) || defined?(StatementParserService)

        count = 0
        documents.each do |doc|
          next if doc.parsed?

          begin
            if defined?(StatementParserJob)
              StatementParserJob.perform_later(doc.id)
            elsif defined?(StatementParserService)
              StatementParserService.new(doc).parse
            end
            count += 1
          rescue StandardError => e
            log_error("Failed to parse statement #{doc.id}: #{e.message}")
          end
        end

        log_info("Triggered parsing for #{count} bank statements")
        count
      end

      def handle_missing_documents(missing_types)
        return unless config[:notify_on_missing]
        return unless defined?(Notification)

        date_range = from_context(:date_range)
        month = date_range&.dig(:month_name) || 'current period'

        Notification.create(
          user: user,
          workspace: workspace,
          title: 'Missing Documents',
          message: "The following documents are missing for #{month}: #{missing_types.map(&:humanize).join(', ')}",
          notification_type: 'warning',
          source: 'workflow',
          source_id: workflow.id
        )
      end

      def build_result_message(results)
        parts = []
        parts << "#{results[:present].size} document types present"
        parts << "#{results[:missing].size} missing" if results[:missing].any?
        parts << "#{results[:parsed]} statements queued for parsing" if results[:parsed] > 0
        parts.join(', ')
      end
    end
  end
end
