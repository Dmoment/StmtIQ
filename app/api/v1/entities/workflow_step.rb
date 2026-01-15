# frozen_string_literal: true

module V1
  module Entities
    class WorkflowStep < Grape::Entity
      expose :id
      expose :workflow_id
      expose :step_type
      expose :name
      expose :display_name
      expose :position
      expose :config
      expose :conditions
      expose :enabled
      expose :continue_on_failure

      # Step metadata
      expose :step_metadata do |step, _options|
        begin
          step_class = step.step_class
          if step_class
            {
              category: step_class.category,
              icon: step_class.icon,
              description: step_class.description
            }
          else
            { category: :unknown, icon: 'help-circle', description: 'Unknown step type' }
          end
        rescue StandardError => e
          Rails.logger.warn("Error getting step metadata: #{e.message}")
          { category: :unknown, icon: 'help-circle', description: 'Unknown step type' }
        end
      end

      # Validation
      expose :is_configured do |step, _options|
        step.configured? rescue false
      end

      expose :config_schema do |step, _options|
        step.config_schema rescue {}
      end

      expose :created_at
      expose :updated_at
    end
  end
end
