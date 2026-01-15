# frozen_string_literal: true

# Job to check and trigger scheduled workflows
# Runs every minute via SolidQueue recurring configuration
# SOLID: Single Responsibility - Only checks schedules and triggers executions
class WorkflowSchedulerJob < ApplicationJob
  queue_as :workflows

  def perform
    Rails.logger.info('[WorkflowScheduler] Checking for scheduled workflows to run')

    scheduled_workflows = Workflow.active.where(trigger_type: 'schedule')
    triggered_count = 0

    scheduled_workflows.find_each do |workflow|
      next unless should_run?(workflow)

      begin
        trigger_workflow(workflow)
        triggered_count += 1
      rescue StandardError => e
        Rails.logger.error(
          "[WorkflowScheduler] Failed to trigger workflow #{workflow.id}: #{e.message}"
        )
      end
    end

    Rails.logger.info("[WorkflowScheduler] Triggered #{triggered_count} workflow(s)")
  end

  private

  def should_run?(workflow)
    cron_expression = workflow.trigger_config['cron']
    return false if cron_expression.blank?

    # Parse cron expression using Fugit
    cron = Fugit::Cron.parse(cron_expression)
    return false unless cron

    # Check if cron matches current time (within 1 minute window)
    # We check if the cron's previous occurrence was within the last minute
    now = Time.current
    previous = cron.previous_time(now + 1.second)

    # The cron should have triggered within the last minute
    return false unless previous
    return false if previous < (now - 1.minute)

    # Check if we already ran this workflow recently (within 2 minutes)
    # to prevent duplicate runs
    return false if workflow.last_executed_at && workflow.last_executed_at > (now - 2.minutes)

    true
  rescue StandardError => e
    Rails.logger.error(
      "[WorkflowScheduler] Error parsing cron for workflow #{workflow.id}: #{e.message}"
    )
    false
  end

  def trigger_workflow(workflow)
    timezone = workflow.trigger_config['timezone'] || 'UTC'
    scheduled_at = Time.current.in_time_zone(timezone)

    execution = Workflows::Engine.new(workflow).execute(
      trigger_source: 'schedule',
      trigger_data: {
        scheduled_at: scheduled_at.iso8601,
        cron: workflow.trigger_config['cron'],
        timezone: timezone
      }
    )

    Rails.logger.info(
      "[WorkflowScheduler] Triggered workflow '#{workflow.name}' (#{workflow.id}), " \
      "execution #{execution.id}"
    )

    execution
  end
end
