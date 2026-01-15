# frozen_string_literal: true

class WorkflowExecution < ApplicationRecord
  belongs_to :workflow
  belongs_to :workspace

  has_many :workflow_step_logs, -> { order(:position) }, dependent: :destroy

  STATUSES = %w[pending running completed failed cancelled].freeze

  validates :status, presence: true, inclusion: { in: STATUSES }

  scope :pending, -> { where(status: 'pending') }
  scope :running, -> { where(status: 'running') }
  scope :completed, -> { where(status: 'completed') }
  scope :failed, -> { where(status: 'failed') }
  scope :cancelled, -> { where(status: 'cancelled') }
  scope :finished, -> { where(status: %w[completed failed cancelled]) }
  scope :in_progress, -> { where(status: %w[pending running]) }
  scope :recent, -> { order(created_at: :desc) }

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

  def cancelled?
    status == 'cancelled'
  end

  def finished?
    %w[completed failed cancelled].include?(status)
  end

  def in_progress?
    %w[pending running].include?(status)
  end

  def can_resume?
    failed? && workflow_step_logs.where(status: 'failed').exists?
  end

  def can_cancel?
    in_progress?
  end

  def cancel!
    update!(status: 'cancelled', completed_at: Time.current)
  end

  # Get the current step being executed
  def current_step
    workflow.workflow_steps.find_by(position: current_step_position)
  end

  # Get progress percentage
  def progress_percentage
    total = workflow.enabled_steps.count
    return 0 if total.zero?
    ((completed_steps_count.to_f / total) * 100).round
  end

  # Duration in seconds
  def duration_seconds
    return nil unless duration_ms
    duration_ms / 1000.0
  end

  # Human-readable duration
  def duration_human
    return nil unless duration_ms

    seconds = duration_ms / 1000
    if seconds < 60
      "#{seconds}s"
    elsif seconds < 3600
      "#{seconds / 60}m #{seconds % 60}s"
    else
      "#{seconds / 3600}h #{(seconds % 3600) / 60}m"
    end
  end

  # Get failed step logs
  def failed_step_logs
    workflow_step_logs.where(status: 'failed')
  end

  # Get successful step logs
  def successful_step_logs
    workflow_step_logs.where(status: 'completed')
  end

  # Get trigger type description
  def trigger_description
    case trigger_source
    when 'manual'
      'Manual trigger'
    when 'schedule'
      'Scheduled run'
    when /^event:/
      "Event: #{trigger_source.sub('event:', '').humanize}"
    else
      trigger_source
    end
  end
end
