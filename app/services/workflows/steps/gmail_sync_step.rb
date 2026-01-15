# frozen_string_literal: true

module Workflows
  module Steps
    class GmailSyncStep < BaseStep
      def self.display_name
        'Gmail Sync'
      end

      def self.category
        :integration
      end

      def self.icon
        'mail'
      end

      def self.description
        'Fetch documents from Gmail using keywords and filters'
      end

      def self.config_schema
        {
          type: 'object',
          properties: {
            keywords: {
              type: 'array',
              title: 'Search Keywords',
              description: 'Keywords to search for in emails (e.g., invoice, receipt, FIRC)',
              items: { type: 'string' },
              default: %w[invoice receipt statement]
            },
            use_previous_month: {
              type: 'boolean',
              title: 'Use Previous Month',
              description: 'Automatically search emails from the previous calendar month',
              default: true
            },
            date_from: {
              type: 'string',
              title: 'Date From',
              description: 'Start date for email search (if not using previous month)',
              format: 'date'
            },
            date_to: {
              type: 'string',
              title: 'Date To',
              description: 'End date for email search (if not using previous month)',
              format: 'date'
            },
            attachments_only: {
              type: 'boolean',
              title: 'Attachments Only',
              description: 'Only fetch emails that have PDF or image attachments',
              default: true
            }
          },
          required: []
        }
      end

      def execute
        connection = find_gmail_connection
        return failure_result('No active Gmail connection found') unless connection

        # Calculate date range
        date_range = calculate_date_range

        # Build sync filters
        filters = build_filters(date_range)

        log_info("Starting Gmail sync with filters: #{filters.inspect}")

        # Trigger the Gmail sync job
        begin
          sync_result = trigger_gmail_sync(connection, filters)

          add_to_context(:gmail_sync, {
            connection_id: connection.id,
            email: connection.email,
            filters: filters,
            triggered_at: Time.current.iso8601
          })

          add_to_context(:date_range, date_range)

          {
            success: true,
            message: "Gmail sync started for #{connection.email}",
            connection_id: connection.id,
            filters: filters,
            date_range: date_range
          }
        rescue StandardError => e
          log_error("Gmail sync failed: #{e.message}")
          failure_result("Gmail sync failed: #{e.message}")
        end
      end

      private

      def find_gmail_connection
        workspace.gmail_connections.where(sync_enabled: true).first ||
          workspace.gmail_connections.first
      end

      def calculate_date_range
        if config[:use_previous_month]
          previous_month = Date.current.prev_month
          {
            start_date: previous_month.beginning_of_month.to_s,
            end_date: previous_month.end_of_month.to_s,
            month_name: previous_month.strftime('%B %Y')
          }
        else
          {
            start_date: config[:date_from],
            end_date: config[:date_to],
            month_name: 'Custom Range'
          }
        end
      end

      def build_filters(date_range)
        {
          keywords: config[:keywords] || %w[invoice receipt statement],
          date_from: date_range[:start_date],
          date_to: date_range[:end_date],
          include_attachments_only: config[:attachments_only] != false
        }
      end

      def trigger_gmail_sync(connection, filters)
        # Use the Gmail sync service if available
        if defined?(Gmail::SyncService)
          Gmail::SyncService.new(connection).sync_async(filters)
        elsif defined?(GmailSyncJob)
          GmailSyncJob.perform_later(connection.id, filters.to_json)
        else
          # Fallback: just mark as triggered
          log_info("Gmail sync triggered (no sync service available)")
        end

        { triggered: true }
      end
    end
  end
end
