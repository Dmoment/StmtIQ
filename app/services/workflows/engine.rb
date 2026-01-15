# frozen_string_literal: true

module Workflows
  class Engine
    attr_reader :workflow

    def initialize(workflow)
      @workflow = workflow
    end

    # Start a new execution
    def execute(trigger_source:, trigger_data: {})
      validate_can_execute!

      execution = create_execution(trigger_source, trigger_data)

      # Queue the execution job
      WorkflowExecutionJob.perform_later(execution.id)

      execution
    end

    # Execute synchronously (for testing)
    def execute_sync(trigger_source:, trigger_data: {})
      validate_can_execute!

      execution = create_execution(trigger_source, trigger_data)

      Workflows::Executor.new(execution).run

      execution.reload
    end

    # Resume a failed execution from the failed step
    def resume(execution)
      raise WorkflowError, 'Execution cannot be resumed' unless execution.can_resume?

      # Reset execution status
      execution.update!(status: 'running')

      # Clear the failed step log so it can be retried
      execution.workflow_step_logs.where(status: 'failed').update_all(
        status: 'pending',
        error_message: nil,
        error_backtrace: nil,
        started_at: nil,
        completed_at: nil,
        duration_ms: nil
      )

      WorkflowExecutionJob.perform_later(execution.id)

      execution
    end

    # Cancel a running execution
    def cancel(execution)
      raise WorkflowError, 'Execution cannot be cancelled' unless execution.can_cancel?

      execution.cancel!
      execution
    end

    private

    def validate_can_execute!
      raise WorkflowError, 'Workflow is not active' unless workflow.can_execute?
      raise WorkflowError, 'Workflow has no enabled steps' if workflow.enabled_steps.empty?
    end

    def create_execution(trigger_source, trigger_data)
      WorkflowExecution.create!(
        workflow: workflow,
        workspace: workflow.workspace,
        status: 'pending',
        trigger_source: trigger_source,
        trigger_data: trigger_data,
        context: build_initial_context(trigger_data)
      )
    end

    def build_initial_context(trigger_data)
      {
        workspace_id: workflow.workspace_id,
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        started_at: Time.current.iso8601,
        trigger_data: trigger_data
      }
    end
  end

  class WorkflowError < StandardError; end
end
