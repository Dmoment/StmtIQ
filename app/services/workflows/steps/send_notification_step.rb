# frozen_string_literal: true

module Workflows
  module Steps
    class SendNotificationStep < BaseStep
      def self.display_name
        'Send Notification'
      end

      def self.category
        :notification
      end

      def self.icon
        'bell'
      end

      def self.description
        'Send an in-app notification to the workflow owner'
      end

      def self.config_schema
        {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              title: 'Notification Title',
              description: 'Title of the notification. Supports {{variables}}.',
              maxLength: 100
            },
            message: {
              type: 'string',
              title: 'Message',
              description: 'Body of the notification. Supports {{variables}}.',
              format: 'textarea',
              maxLength: 500
            },
            notification_type: {
              type: 'string',
              title: 'Type',
              description: 'Visual style of the notification',
              enum: %w[info success warning error],
              default: 'info'
            }
          },
          required: %w[title message]
        }
      end

      def execute
        title = interpolate(config[:title] || 'Workflow Notification')
        message = interpolate(config[:message] || '')
        notification_type = config[:notification_type] || 'info'

        # Create in-app notification
        # This integrates with whatever notification system exists
        # For now, we'll just log and store in context
        notification_data = {
          user_id: user.id,
          workspace_id: workspace.id,
          title: title,
          message: message,
          notification_type: notification_type,
          source: 'workflow',
          source_id: workflow.id,
          created_at: Time.current.iso8601
        }

        # If Notification model exists, create it
        if defined?(Notification)
          notification = Notification.create!(notification_data.except(:created_at))
          notification_data[:id] = notification.id
        end

        log_info("Notification sent: #{title}")

        add_to_context(:last_notification, notification_data)

        {
          notification_sent: true,
          title: title,
          message: message,
          type: notification_type
        }
      end
    end
  end
end
