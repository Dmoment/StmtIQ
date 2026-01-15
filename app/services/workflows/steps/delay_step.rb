# frozen_string_literal: true

module Workflows
  module Steps
    class DelayStep < BaseStep
      MAX_DELAY_SECONDS = 300 # 5 minutes max for synchronous delay

      def self.display_name
        'Delay'
      end

      def self.category
        :utility
      end

      def self.icon
        'clock'
      end

      def self.description
        'Wait for a specified duration before continuing'
      end

      def self.config_schema
        {
          type: 'object',
          properties: {
            duration: {
              type: 'integer',
              title: 'Duration',
              description: 'How long to wait',
              minimum: 1,
              maximum: 60,
              default: 5
            },
            unit: {
              type: 'string',
              title: 'Time Unit',
              description: 'Unit of time',
              enum: %w[seconds minutes],
              default: 'seconds'
            }
          },
          required: %w[duration unit]
        }
      end

      def execute
        duration = config[:duration] || 5
        unit = config[:unit] || 'seconds'

        delay_seconds = case unit
                        when 'minutes'
                          duration * 60
                        else
                          duration
                        end

        # Cap the delay to prevent very long waits
        delay_seconds = [delay_seconds, MAX_DELAY_SECONDS].min

        log_info("Delaying for #{delay_seconds} seconds")

        sleep(delay_seconds)

        add_to_context(:last_delay, {
          duration: delay_seconds,
          completed_at: Time.current.iso8601
        })

        {
          delayed_seconds: delay_seconds,
          completed_at: Time.current.iso8601
        }
      end
    end
  end
end
