# frozen_string_literal: true

class WorkflowStep < ApplicationRecord
  belongs_to :workflow

  has_many :workflow_step_logs, dependent: :destroy

  validates :step_type, presence: true
  validates :position, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :position, uniqueness: { scope: :workflow_id, message: 'must be unique within workflow' }

  scope :enabled, -> { where(enabled: true) }
  scope :disabled, -> { where(enabled: false) }
  scope :ordered, -> { order(:position) }

  before_validation :set_default_name, if: -> { name.blank? }

  def enabled?
    enabled
  end

  def disabled?
    !enabled
  end

  def enable!
    update!(enabled: true)
  end

  def disable!
    update!(enabled: false)
  end

  # Check if step type is valid (exists in registry)
  def valid_step_type?
    Workflows::Steps::Registry.valid_step_type?(step_type)
  end

  # Get the step class from registry
  def step_class
    Workflows::Steps::Registry[step_type]
  end

  # Get display name from step class
  def display_name
    return name if name.present?
    step_class&.display_name || step_type.humanize
  end

  # Get category from step class
  def category
    step_class&.category || :general
  end

  # Get icon from step class
  def icon
    step_class&.icon || 'play'
  end

  # Get config schema for UI
  def config_schema
    step_class&.config_schema || {}
  rescue StandardError
    {}
  end

  # Check if step has conditions
  def conditional?
    conditions.present? && conditions.any?
  end

  # Check if step configuration is complete
  def configured?
    schema = config_schema
    return true if schema.blank?

    # Handle both symbol and string keys
    properties = schema[:properties] || schema['properties']
    return true if properties.blank?

    required_fields = schema[:required] || schema['required'] || []
    return true if required_fields.empty?

    required_fields.all? { |field| config[field.to_s].present? }
  rescue StandardError
    true # Default to configured if we can't determine
  end

  private

  def set_default_name
    self.name = step_class&.display_name || step_type.humanize
  end
end
