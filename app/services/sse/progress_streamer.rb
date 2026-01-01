# frozen_string_literal: true

module Sse
  # Handles Server-Sent Events streaming for statement parsing progress
  class ProgressStreamer
    POLL_INTERVAL = 0.5 # seconds
    MAX_DURATION = 5.minutes

    attr_reader :statement, :stream, :formatter

    def initialize(statement, stream, formatter: EventFormatter)
      @statement = statement
      @stream = stream
      @formatter = formatter
      @start_time = Time.current
    end

    # Streams progress updates until parsing completes or timeout
    def stream!
      send_initial_progress
      last_updated_at = current_updated_at

      loop do
        break if timeout_reached?
        break if statement_deleted?

        @statement.reload
        current = current_updated_at

        if current != last_updated_at
          send_progress
          last_updated_at = current
        end

        break if parsing_complete?

        sleep POLL_INTERVAL
      end

      send_final_event if parsing_complete?
      send_timeout_event if timeout_reached?
    rescue IOError, Errno::EPIPE
      Rails.logger.info("SSE client disconnected for statement #{@statement.id}")
    end

    private

    def send_initial_progress
      send_progress
    end

    def send_progress
      data = formatter.progress_event(@statement)
      write_event('progress', data)
    end

    def send_final_event
      data = formatter.complete_event(@statement)
      write_event('complete', data)
    end

    def send_timeout_event
      Rails.logger.warn("SSE connection timeout for statement #{@statement.id}")
      data = formatter.timeout_event(@statement.id)
      write_event('error', data)
    end

    def write_event(event_type, data)
      @stream.write(formatter.format(event_type, data))
    end

    def current_updated_at
      @statement.parsing_progress['updated_at']
    end

    def parsing_complete?
      progress = @statement.parsing_progress
      status = progress['status']

      status == 'completed' ||
        status == 'failed' ||
        @statement.status == 'parsed' ||
        @statement.status == 'failed'
    end

    def timeout_reached?
      Time.current - @start_time > MAX_DURATION
    end

    def statement_deleted?
      !Statement.exists?(@statement.id)
    end
  end
end
