# frozen_string_literal: true

module Workflows
  module Steps
    class ConditionStep < BaseStep
      def self.display_name
        'Condition'
      end

      def self.category
        :logic
      end

      def self.icon
        'git-branch'
      end

      def self.description
        'Evaluate a condition and store the result for subsequent steps'
      end

      def self.config_schema
        {
          type: 'object',
          properties: {
            condition_name: {
              type: 'string',
              title: 'Condition Name',
              description: 'Name to identify this condition result',
              default: 'condition_result'
            },
            rules: {
              type: 'array',
              title: 'Rules',
              description: 'Conditions to evaluate',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    title: 'Field',
                    description: 'Context field to check (use dot notation, e.g., trigger_data.amount)'
                  },
                  operator: {
                    type: 'string',
                    title: 'Operator',
                    enum: %w[
                      equals not_equals
                      greater_than less_than
                      greater_than_or_equals less_than_or_equals
                      contains not_contains
                      starts_with ends_with
                      is_empty is_not_empty
                      in not_in
                      matches
                    ]
                  },
                  value: {
                    title: 'Value',
                    description: 'Value to compare against'
                  }
                },
                required: %w[field operator]
              }
            },
            combinator: {
              type: 'string',
              title: 'Combine Rules With',
              description: 'How to combine multiple rules',
              enum: %w[and or],
              default: 'and'
            },
            stop_if_false: {
              type: 'boolean',
              title: 'Stop Workflow if False',
              description: 'If true, stops the workflow when condition is false',
              default: false
            }
          },
          required: %w[rules]
        }
      end

      def execute
        condition_name = config[:condition_name] || 'condition_result'
        rules = config[:rules] || []
        combinator = config[:combinator] || 'and'
        stop_if_false = config[:stop_if_false] || false

        # Build condition structure for evaluator
        condition_config = {
          rules: rules,
          combinator: combinator
        }

        # Evaluate using the ConditionEvaluator
        evaluator = Workflows::ConditionEvaluator.new(condition_config, context)
        result = evaluator.evaluate

        log_info("Condition '#{condition_name}' evaluated to: #{result}")

        # Store result in context
        add_to_context(condition_name, result)
        add_to_context(:last_condition_result, result)

        # If stop_if_false is enabled and result is false, raise to skip remaining steps
        if stop_if_false && !result
          raise StopWorkflowError, "Condition '#{condition_name}' was false, stopping workflow"
        end

        {
          condition_name: condition_name,
          result: result,
          rules_count: rules.size,
          combinator: combinator
        }
      end
    end

    class StopWorkflowError < StandardError; end
  end
end
