# frozen_string_literal: true

module V1
  module Entities
    class WorkflowTemplate < Grape::Entity
      expose :id
      expose :name
      expose :description
      expose :category
      expose :featured

      # Preview of what the template contains
      expose :steps_preview do |template, _options|
        steps = template.definition['steps'] || []
        steps.map { |s| { step_type: s['step_type'], name: s['name'] } }
      end

      expose :steps_count do |template, _options|
        (template.definition['steps'] || []).size
      end

      expose :trigger_type do |template, _options|
        template.definition['trigger_type']
      end

      # Full definition (for detail view)
      expose :definition, if: ->(_, options) { options[:full] }

      expose :created_at
      expose :updated_at
    end
  end
end
