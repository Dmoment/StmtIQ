# frozen_string_literal: true

module V1
  module Entities
    class WorkflowStepLog < Grape::Entity
      expose :id
      expose :workflow_execution_id
      expose :workflow_step_id
      expose :status
      expose :position

      # Step info
      expose :step_name do |log, _options|
        log.workflow_step&.display_name
      end
      expose :step_type do |log, _options|
        log.workflow_step&.step_type
      end

      # Timing
      expose :started_at
      expose :completed_at
      expose :duration_ms

      # Data (for full view)
      expose :input_data, if: ->(_, options) { options[:full] }
      expose :output_data, if: ->(_, options) { options[:full] }

      # Error info (only if failed)
      expose :error_message, if: ->(log, _) { log.failed? }
      expose :error_backtrace, if: ->(_, options) { options[:full] && options[:include_backtrace] }
      expose :retry_count, if: ->(log, _) { log.retry_count.positive? }

      expose :created_at
      expose :updated_at
    end
  end
end
