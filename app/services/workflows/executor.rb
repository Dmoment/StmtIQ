# frozen_string_literal: true

module Workflows
  class Executor
    attr_reader :execution, :workflow

    def initialize(execution)
      @execution = execution
      @workflow = execution.workflow
    end

    def run
      return if execution.cancelled?

      start_execution

      steps = workflow.workflow_steps.enabled.order(:position)
      context = execution.context.deep_dup

      steps.each do |step|
        break if execution.reload.cancelled?
        next if already_completed?(step)

        result = execute_step(step, context)

        if result[:success]
          context = context.merge(result[:context_updates] || {})
          update_execution_progress(step, context)
        else
          handle_step_failure(step, result)
          return unless step.continue_on_failure
        end
      end

      complete_execution
    rescue StandardError => e
      fail_execution(e)
      raise
    end

    private

    def start_execution
      execution.update!(
        status: 'running',
        started_at: Time.current
      )
    end

    def execute_step(step, context)
      log = find_or_create_step_log(step)

      begin
        log.update!(status: 'running', started_at: Time.current)

        # Check conditions
        unless conditions_met?(step, context)
          log.update!(status: 'skipped', completed_at: Time.current)
          return { success: true, skipped: true }
        end

        # Get step class from registry
        step_class = Steps::Registry.step_class(step.step_type)
        raise StepError, "Unknown step type: #{step.step_type}" unless step_class

        # Execute the step
        step_executor = step_class.new(
          execution: execution,
          step: step,
          context: context
        )

        result = step_executor.execute

        log.update!(
          status: 'completed',
          output_data: sanitize_output(result),
          completed_at: Time.current,
          duration_ms: calculate_duration(log.started_at)
        )

        {
          success: true,
          context_updates: step_executor.context_updates
        }

      rescue StandardError => e
        log.update!(
          status: 'failed',
          error_message: e.message,
          error_backtrace: e.backtrace&.first(10)&.join("\n"),
          completed_at: Time.current,
          duration_ms: calculate_duration(log.started_at),
          retry_count: log.retry_count + 1
        )

        { success: false, error: e.message }
      end
    end

    def conditions_met?(step, context)
      return true if step.conditions.blank?

      Workflows::ConditionEvaluator.new(step.conditions, context).evaluate
    rescue StandardError => e
      Rails.logger.error("Condition evaluation failed: #{e.message}")
      false
    end

    def find_or_create_step_log(step)
      existing = execution.workflow_step_logs.find_by(
        workflow_step: step,
        status: 'pending'
      )

      return existing if existing

      WorkflowStepLog.create!(
        workflow_execution: execution,
        workflow_step: step,
        position: step.position,
        status: 'pending',
        input_data: {
          config: step.config,
          context_keys: execution.context.keys
        }
      )
    end

    def already_completed?(step)
      execution.workflow_step_logs.exists?(
        workflow_step: step,
        status: 'completed'
      )
    end

    def update_execution_progress(step, context)
      execution.update!(
        context: context,
        current_step_position: step.position,
        completed_steps_count: execution.completed_steps_count + 1
      )
    end

    def handle_step_failure(step, result)
      execution.update!(
        status: 'failed',
        failed_steps_count: execution.failed_steps_count + 1,
        error_message: "Step '#{step.display_name}' failed: #{result[:error]}",
        completed_at: Time.current,
        duration_ms: calculate_duration(execution.started_at)
      )
    end

    def complete_execution
      execution.update!(
        status: 'completed',
        completed_at: Time.current,
        duration_ms: calculate_duration(execution.started_at)
      )

      # Update workflow statistics
      workflow.update!(
        executions_count: workflow.executions_count + 1,
        last_executed_at: Time.current
      )
    end

    def fail_execution(error)
      execution.update!(
        status: 'failed',
        error_message: error.message,
        completed_at: Time.current,
        duration_ms: calculate_duration(execution.started_at)
      )
    end

    def calculate_duration(started_at)
      return 0 unless started_at
      ((Time.current - started_at) * 1000).to_i
    end

    def sanitize_output(result)
      # Ensure output is serializable and not too large
      return {} unless result.is_a?(Hash)

      result.transform_values do |v|
        case v
        when String
          v.truncate(10_000)
        when Array
          v.first(100)
        else
          v
        end
      end
    end
  end

  class StepError < StandardError; end
end
