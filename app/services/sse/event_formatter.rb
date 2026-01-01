# frozen_string_literal: true

module Sse
  # Formats statement progress data into SSE events
  class EventFormatter
    def self.progress_event(statement)
      progress = statement.parsing_progress

      {
        id: statement.id,
        status: statement.status,
        parsing_status: progress['status'],
        processed: progress['processed'] || 0,
        transaction_count: statement.transactions.count,
        duration_seconds: progress['duration_seconds'],
        updated_at: progress['updated_at']
      }
    end

    def self.complete_event(statement)
      progress_event(statement).merge(completed: true)
    end

    def self.error_event(statement_id:, error:, message: nil)
      {
        id: statement_id,
        error: error,
        message: message || error
      }
    end

    def self.timeout_event(statement_id)
      error_event(
        statement_id: statement_id,
        error: 'Connection timeout',
        message: 'Progress stream timed out after 5 minutes'
      )
    end

    # Formats data as SSE event string
    def self.format(event_type, data)
      json_data = data.to_json
      "event: #{event_type}\ndata: #{json_data}\n\n"
    end
  end
end
