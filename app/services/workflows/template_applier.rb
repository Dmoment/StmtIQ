# frozen_string_literal: true

module Workflows
  class TemplateApplier
    attr_reader :template, :workspace, :user, :overrides

    def initialize(template:, workspace:, user:, overrides: {})
      @template = template
      @workspace = workspace
      @user = user
      @overrides = overrides.with_indifferent_access
    end

    def apply
      definition = template.definition.with_indifferent_access

      workflow = create_workflow(definition)
      create_steps(workflow, definition[:steps] || [])

      workflow
    end

    private

    def create_workflow(definition)
      workspace.workflows.create!(
        user: user,
        name: overrides[:name] || definition[:name] || template.name,
        description: definition[:description] || template.description,
        trigger_type: definition[:trigger_type] || 'manual',
        trigger_config: merge_trigger_config(definition[:trigger_config]),
        status: 'draft',
        metadata: {
          created_from_template: true,
          template_id: template.id,
          template_name: template.name
        }
      )
    end

    def merge_trigger_config(default_config)
      default = (default_config || {}).with_indifferent_access
      override = (overrides[:trigger_config] || {}).with_indifferent_access

      default.merge(override)
    end

    def create_steps(workflow, steps_definition)
      steps_definition.each_with_index do |step_def, index|
        step_def = step_def.with_indifferent_access

        workflow.workflow_steps.create!(
          step_type: step_def[:step_type],
          name: step_def[:name],
          position: step_def[:position] || (index + 1),
          config: step_def[:config] || {},
          conditions: step_def[:conditions] || {},
          enabled: step_def[:enabled] != false,
          continue_on_failure: step_def[:continue_on_failure] || false
        )
      end
    end
  end
end
