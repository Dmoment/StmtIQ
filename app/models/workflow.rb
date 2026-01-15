# frozen_string_literal: true

class Workflow < ApplicationRecord
  belongs_to :workspace
  belongs_to :user

  has_many :workflow_steps, -> { order(:position) }, dependent: :destroy
  has_many :workflow_executions, dependent: :destroy

  STATUSES = %w[draft active paused archived].freeze
  TRIGGER_TYPES = %w[schedule event manual].freeze

  validates :name, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :trigger_type, presence: true, inclusion: { in: TRIGGER_TYPES }

  scope :active, -> { where(status: 'active') }
  scope :draft, -> { where(status: 'draft') }
  scope :paused, -> { where(status: 'paused') }
  scope :archived, -> { where(status: 'archived') }
  scope :scheduled, -> { where(trigger_type: 'schedule') }
  scope :event_triggered, -> { where(trigger_type: 'event') }
  scope :manual, -> { where(trigger_type: 'manual') }
  scope :recent, -> { order(updated_at: :desc) }

  def active?
    status == 'active'
  end

  def draft?
    status == 'draft'
  end

  def paused?
    status == 'paused'
  end

  def archived?
    status == 'archived'
  end

  def can_activate?
    draft? || paused?
  end

  def can_execute?
    active?
  end

  def activate!
    update!(status: 'active')
  end

  def pause!
    update!(status: 'paused')
  end

  def archive!
    update!(status: 'archived')
  end

  def enabled_steps
    workflow_steps.where(enabled: true)
  end

  def last_execution
    workflow_executions.order(created_at: :desc).first
  end

  def successful_executions_count
    workflow_executions.where(status: 'completed').count
  end

  def failed_executions_count
    workflow_executions.where(status: 'failed').count
  end

  # Cron expression for scheduled workflows
  def cron_expression
    return nil unless trigger_type == 'schedule'
    trigger_config&.dig('cron')
  end

  # Event type for event-triggered workflows
  def event_type
    return nil unless trigger_type == 'event'
    trigger_config&.dig('event_type')
  end
end
