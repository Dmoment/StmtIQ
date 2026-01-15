# frozen_string_literal: true

module Workflows
  module Steps
    class BaseStep
      attr_reader :execution, :step, :context, :context_updates

      def initialize(execution:, step:, context:)
        @execution = execution
        @step = step
        @context = context.with_indifferent_access
        @context_updates = {}
      end

      # Override in subclasses - must return a hash with result data
      def execute
        raise NotImplementedError, "#{self.class.name} must implement #execute"
      end

      # Human-readable name for the step type
      def self.display_name
        name.demodulize.underscore.humanize
      end

      # Category for grouping in UI
      def self.category
        :general
      end

      # Icon identifier for UI
      def self.icon
        'play'
      end

      # JSON Schema for step configuration
      def self.config_schema
        {
          type: 'object',
          properties: {},
          required: []
        }
      end

      # Description for UI
      def self.description
        ''
      end

      protected

      def workspace
        execution.workspace
      end

      def workflow
        execution.workflow
      end

      def user
        workflow.user
      end

      def config
        step.config.with_indifferent_access
      end

      # Add data to shared context for subsequent steps
      def add_to_context(key, value)
        @context_updates[key.to_s] = value
        @context[key.to_s] = value
      end

      # Get data from context (set by previous steps or trigger)
      def from_context(key, default = nil)
        context[key.to_s] || context[key.to_sym] || default
      end

      # Get trigger data
      def trigger_data
        context[:trigger_data] || {}
      end

      # Interpolate template strings with context values
      # e.g., "Hello {{user.name}}" => "Hello John"
      def interpolate(template)
        return template unless template.is_a?(String)

        template.gsub(/\{\{([^}]+)\}\}/) do |_match|
          key_path = ::Regexp.last_match(1).strip
          resolve_key_path(key_path) || ''
        end
      end

      # Log a message for debugging
      def log_info(message)
        Rails.logger.info("[Workflow #{workflow.id}] [Step #{step.id}] #{message}")
      end

      def log_error(message)
        Rails.logger.error("[Workflow #{workflow.id}] [Step #{step.id}] #{message}")
      end

      # Standard result helpers - DRY principle
      def success_result(message, **extras)
        { success: true, message: message }.merge(extras)
      end

      def failure_result(message)
        { success: false, error: message }
      end

      private

      def resolve_key_path(key_path)
        parts = key_path.split('.')
        result = context

        parts.each do |part|
          return nil unless result.respond_to?(:[])

          result = result[part] || result[part.to_sym]
        end

        result
      end
    end
  end
end
