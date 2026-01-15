# frozen_string_literal: true

module V1
  module Entities
    class WorkflowExecution < Grape::Entity
      expose :id
      expose :workflow_id
      expose :status
      expose :trigger_source
      expose :trigger_data, if: ->(_, options) { options[:full] }

      # Progress
      expose :current_step_position
      expose :completed_steps_count
      expose :failed_steps_count
      expose :progress_percentage

      # Timing
      expose :started_at
      expose :completed_at
      expose :duration_ms
      expose :duration_human

      # Error info (only if failed)
      expose :error_message, if: ->(execution, _) { execution.failed? }

      # Step logs (for full view)
      expose :step_logs, using: V1::Entities::WorkflowStepLog, if: ->(_, options) { options[:full] } do |execution, _options|
        execution.workflow_step_logs.includes(:workflow_step).order(:position)
      end

      # Status helpers
      expose :can_resume do |execution, _options|
        execution.can_resume?
      end
      expose :can_cancel do |execution, _options|
        execution.pending? || execution.running?
      end

      expose :created_at
      expose :updated_at
    end
  end
end
