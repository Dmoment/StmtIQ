# frozen_string_literal: true

module V1
  module Entities
    class Workflow < Grape::Entity
      expose :id
      expose :name
      expose :description
      expose :status
      expose :trigger_type
      expose :trigger_config

      # Computed fields
      expose :is_active do |workflow, _options|
        workflow.active?
      end
      expose :can_execute do |workflow, _options|
        workflow.can_execute?
      end
      expose :steps_count do |workflow, _options|
        workflow.workflow_steps.count
      end
      expose :enabled_steps_count do |workflow, _options|
        workflow.workflow_steps.enabled.count
      end

      # Statistics
      expose :executions_count
      expose :last_executed_at

      # Trigger description
      expose :trigger_description do |workflow, _options|
        case workflow.trigger_type
        when 'schedule'
          workflow.trigger_config['description'] || workflow.trigger_config['cron']
        when 'event'
          "On #{workflow.trigger_config['event_type']&.humanize}"
        when 'manual'
          'Manual trigger'
        else
          workflow.trigger_type&.humanize
        end
      end

      # Steps (for full view)
      expose :workflow_steps, using: V1::Entities::WorkflowStep, if: ->(_, options) { options[:full] }

      # Recent executions (for full view)
      expose :recent_executions, using: V1::Entities::WorkflowExecution, if: ->(_, options) { options[:full] } do |workflow, _options|
        workflow.workflow_executions.recent.limit(5)
      end

      # Metadata
      expose :metadata, if: ->(_, options) { options[:full] }

      expose :created_at
      expose :updated_at
    end
  end
end
