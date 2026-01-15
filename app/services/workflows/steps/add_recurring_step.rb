# frozen_string_literal: true

module Workflows
  module Steps
    class AddRecurringStep < BaseStep
      def self.display_name
        'Add Recurring Invoices'
      end

      def self.category
        :document
      end

      def self.icon
        'refresh-cw'
      end

      def self.description
        'Add recurring invoices (rent, utilities, subscriptions) to the bucket'
      end

      def self.config_schema
        {
          type: 'object',
          properties: {
            invoice_categories: {
              type: 'array',
              title: 'Invoice Categories',
              description: 'Types of recurring invoices to look for',
              items: { type: 'string' },
              default: %w[rent internet electricity phone subscriptions]
            },
            auto_match: {
              type: 'boolean',
              title: 'Auto-match Transactions',
              description: 'Automatically link invoices to matching transactions',
              default: true
            },
            create_if_missing: {
              type: 'boolean',
              title: 'Create Placeholder if Missing',
              description: 'Create a placeholder entry if no invoice is found',
              default: false
            },
            notify_on_missing: {
              type: 'boolean',
              title: 'Notify if Missing',
              description: 'Send notification when recurring invoices are missing',
              default: true
            }
          },
          required: []
        }
      end

      def execute
        bucket_info = from_context(:bucket)
        return failure_result('No bucket found in context. Run "Create Bucket" step first.') unless bucket_info

        categories = config[:invoice_categories] || %w[rent internet electricity]

        log_info("Looking for recurring invoices: #{categories.join(', ')}")

        results = {
          found: [],
          missing: [],
          matched: 0
        }

        categories.each do |category|
          invoice = find_recurring_invoice(category, bucket_info)

          if invoice
            results[:found] << { category: category, invoice_id: invoice.id }
            add_invoice_to_bucket(invoice, bucket_info[:id])

            if config[:auto_match]
              matched = auto_match_transaction(invoice)
              results[:matched] += 1 if matched
            end
          else
            results[:missing] << category

            if config[:create_if_missing]
              placeholder = create_placeholder_invoice(category, bucket_info[:id])
              results[:found] << { category: category, invoice_id: placeholder&.id, placeholder: true }
            end
          end
        end

        # Send notification for missing invoices
        if config[:notify_on_missing] && results[:missing].any?
          notify_missing_invoices(results[:missing])
        end

        add_to_context(:recurring_invoices, results)

        {
          success: true,
          found_count: results[:found].size,
          missing_count: results[:missing].size,
          matched_count: results[:matched],
          missing_categories: results[:missing],
          message: "Found #{results[:found].size} recurring invoices, #{results[:missing].size} missing"
        }
      rescue StandardError => e
        log_error("Add recurring invoices failed: #{e.message}")
        failure_result("Failed to add recurring invoices: #{e.message}")
      end

      private

      def find_recurring_invoice(category, bucket_info)
        return nil unless defined?(Invoice)

        # Get date range from context or bucket
        date_range = from_context(:date_range)
        start_date = date_range&.dig(:start_date) || Date.current.prev_month.beginning_of_month
        end_date = date_range&.dig(:end_date) || Date.current.prev_month.end_of_month

        # Look for invoices matching this category in the date range
        workspace.invoices
                 .where(category: category)
                 .where('invoice_date >= ? AND invoice_date <= ?', start_date, end_date)
                 .first
      end

      def add_invoice_to_bucket(invoice, bucket_id)
        return unless defined?(BucketItem) || invoice.respond_to?(:bucket_id=)

        if invoice.respond_to?(:bucket_id=)
          invoice.update(bucket_id: bucket_id)
        elsif defined?(BucketItem)
          BucketItem.find_or_create_by!(
            bucket_id: bucket_id,
            item_type: 'Invoice',
            item_id: invoice.id
          )
        end
      end

      def auto_match_transaction(invoice)
        return false unless defined?(Transaction)

        # Find transactions matching this invoice amount
        transaction = workspace.transactions
                               .where(amount: invoice.total_amount)
                               .where(invoice_id: nil)
                               .first

        return false unless transaction

        transaction.update(invoice_id: invoice.id)
        log_info("Matched invoice #{invoice.id} to transaction #{transaction.id}")
        true
      end

      def create_placeholder_invoice(category, bucket_id)
        return nil unless defined?(Invoice)

        date_range = from_context(:date_range)
        month = date_range&.dig(:month_name) || Date.current.prev_month.strftime('%B %Y')

        workspace.invoices.create!(
          user: user,
          bucket_id: bucket_id,
          category: category,
          vendor_name: category.humanize,
          description: "Placeholder for #{category.humanize} - #{month}",
          status: 'pending',
          invoice_date: Date.current.prev_month.end_of_month
        )
      rescue StandardError => e
        log_error("Failed to create placeholder invoice: #{e.message}")
        nil
      end

      def notify_missing_invoices(missing_categories)
        return unless defined?(Notification)

        message = "Missing recurring invoices for: #{missing_categories.map(&:humanize).join(', ')}"

        Notification.create(
          user: user,
          workspace: workspace,
          title: 'Missing Recurring Invoices',
          message: message,
          notification_type: 'warning',
          source: 'workflow',
          source_id: workflow.id
        )
      end
    end
  end
end
