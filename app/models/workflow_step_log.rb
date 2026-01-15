# frozen_string_literal: true

class WorkflowStepLog < ApplicationRecord
  belongs_to :workflow_execution
  belongs_to :workflow_step

  STATUSES = %w[pending running completed failed skipped].freeze

  validates :status, presence: true, inclusion: { in: STATUSES }

  scope :pending, -> { where(status: 'pending') }
  scope :running, -> { where(status: 'running') }
  scope :completed, -> { where(status: 'completed') }
  scope :failed, -> { where(status: 'failed') }
  scope :skipped, -> { where(status: 'skipped') }
  scope :finished, -> { where(status: %w[completed failed skipped]) }
  scope :ordered, -> { order(:position) }

  def pending?
    status == 'pending'
  end

  def running?
    status == 'running'
  end

  def completed?
    status == 'completed'
  end

  def failed?
    status == 'failed'
  end

  def skipped?
    status == 'skipped'
  end

  def finished?
    %w[completed failed skipped].include?(status)
  end

  # Duration in seconds
  def duration_seconds
    return nil unless duration_ms
    duration_ms / 1000.0
  end

  # Human-readable duration
  def duration_human
    return nil unless duration_ms

    if duration_ms < 1000
      "#{duration_ms}ms"
    elsif duration_ms < 60_000
      "#{(duration_ms / 1000.0).round(1)}s"
    else
      seconds = duration_ms / 1000
      "#{seconds / 60}m #{seconds % 60}s"
    end
  end

  # Step display name
  def step_name
    workflow_step.display_name
  end

  # Step type
  def step_type
    workflow_step.step_type
  end

  # Check if step can be retried
  def can_retry?
    failed?
  end

  # Get error summary
  def error_summary
    return nil unless error_message
    error_message.truncate(100)
  end
end
