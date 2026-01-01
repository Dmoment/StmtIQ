# frozen_string_literal: true

module Sse
  # Sets up SSE response headers
  class ResponseSetup
    HEADERS = {
      'Content-Type' => 'text/event-stream',
      'Cache-Control' => 'no-cache',
      'X-Accel-Buffering' => 'no' # Disable nginx buffering
    }.freeze

    def self.call(response)
      HEADERS.each do |key, value|
        response.headers[key] = value
      end
    end
  end
end
