# frozen_string_literal: true

module Api
  module V1
    # Server-Sent Events (SSE) endpoint for real-time parsing progress
    #
    # Usage:
    #   GET /api/v1/statements/:id/progress/stream
    #
    # Sends progress updates as SSE events:
    #   event: progress
    #   data: {"id": 1, "status": "processing", "processed": 1234, ...}
    #
    # Closes connection when parsing completes or fails.
    class StatementProgressController < ApplicationController
      include ActionController::Live
      include ::ApiAuthentication

      before_action :set_statement

      # SSE stream endpoint
      def stream
        return unless @statement

        Sse::ResponseSetup.call(response)

        streamer = Sse::ProgressStreamer.new(@statement, response.stream)
        streamer.stream!
      ensure
        response.stream.close if response.stream
      end

      private

      def set_statement
        @statement = current_user.statements.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        Sse::ResponseSetup.call(response)

        error_data = Sse::EventFormatter.error_event(
          statement_id: params[:id],
          error: 'Statement not found'
        )
        response.stream.write(Sse::EventFormatter.format('error', error_data))
        response.stream.close
      end
    end
  end
end
