# frozen_string_literal: true

# Job to execute a workflow run
# SOLID: Single Responsibility - Only handles job execution, delegates to executor
class WorkflowExecutionJob < ApplicationJob
  queue_as :workflows

  # Retry with exponential backoff on transient errors
  retry_on ActiveRecord::Deadlocked, wait: :polynomially_longer, attempts: 3
  retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 3

  # Don't retry on missing records
  discard_on ActiveRecord::RecordNotFound

  def perform(execution_id)
    execution = WorkflowExecution.find_by(id: execution_id)
    return unless execution
    return if execution.cancelled?

    Rails.logger.info(
      "[WorkflowExecution #{execution_id}] Starting execution for workflow '#{execution.workflow.name}'"
    )

    Workflows::Executor.new(execution).run

    execution.reload

    case execution.status
    when 'completed'
      Rails.logger.info(
        "[WorkflowExecution #{execution_id}] Completed successfully in #{execution.duration_human}"
      )
    when 'failed'
      Rails.logger.warn(
        "[WorkflowExecution #{execution_id}] Failed: #{execution.error_message}"
      )
    end
  rescue StandardError => e
    Rails.logger.error(
      "[WorkflowExecution #{execution_id}] Unexpected error: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}"
    )
    raise
  end
end
