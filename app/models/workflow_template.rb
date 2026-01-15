# frozen_string_literal: true

class WorkflowTemplate < ApplicationRecord
  CATEGORIES = %w[finance compliance automation reporting sharing].freeze

  validates :name, presence: true
  validates :category, inclusion: { in: CATEGORIES }, allow_blank: true
  validates :definition, presence: true

  scope :featured, -> { where(featured: true) }
  scope :by_category, ->(category) { where(category: category) }
  scope :alphabetical, -> { order(:name) }

  def featured?
    featured
  end

  # Get trigger type from definition
  def trigger_type
    definition&.dig('trigger_type')
  end

  # Get trigger config from definition
  def trigger_config
    definition&.dig('trigger_config') || {}
  end

  # Get steps from definition
  def steps_definition
    definition&.dig('steps') || []
  end

  # Count of steps in template
  def steps_count
    steps_definition.size
  end

  # Get step types used in this template
  def step_types
    steps_definition.map { |s| s['step_type'] }.uniq
  end

  # Description with fallback
  def display_description
    description.presence || "#{steps_count} step workflow template"
  end
end
