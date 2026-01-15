# frozen_string_literal: true

module Workflows
  module Steps
    class Registry
      # Registry of all available step types
      # Each step type maps to a class name that inherits from BaseStep
      # Using string class names for lazy loading with Rails autoload

      STEP_TYPES = {
        # === INTEGRATION ACTIONS ===
        'gmail_sync' => 'Workflows::Steps::GmailSyncStep',
        'share_documents' => 'Workflows::Steps::ShareDocumentsStep',

        # === DOCUMENT ACTIONS ===
        'create_bucket' => 'Workflows::Steps::CreateBucketStep',
        'add_recurring' => 'Workflows::Steps::AddRecurringStep',
        'check_documents' => 'Workflows::Steps::CheckDocumentsStep',
        'organize_by_month' => 'Workflows::Steps::OrganizeByMonthStep',

        # === NOTIFICATION ACTIONS ===
        'send_notification' => 'Workflows::Steps::SendNotificationStep',
        'notify' => 'Workflows::Steps::SendNotificationStep', # Alias for notify

        # === CONDITIONAL STEPS ===
        'condition' => 'Workflows::Steps::ConditionStep',

        # === UTILITY STEPS ===
        'delay' => 'Workflows::Steps::DelayStep'
      }.freeze

      class << self
        # Resolve class name to actual class (lazy loading)
        def resolve_class(class_name)
          class_name.constantize
        rescue NameError => e
          Rails.logger.warn("Failed to load step class #{class_name}: #{e.message}")
          nil
        end

        # Get step class by type
        def step_class(type)
          class_name = STEP_TYPES[type.to_s]
          return nil unless class_name

          resolve_class(class_name)
        end

        # Alias for hash-like access
        def [](type)
          step_class(type)
        end

        # Get all step types
        def step_types
          STEP_TYPES.keys
        end

        # Get all available step types with metadata for UI
        def available_steps
          STEP_TYPES.map do |type, class_name|
            klass = resolve_class(class_name)
            next nil unless klass

            {
              type: type,
              name: klass.display_name,
              description: klass.description,
              category: klass.category,
              icon: klass.icon,
              config_schema: klass.config_schema
            }
          end.compact
        end

        # Get steps grouped by category for UI
        def steps_by_category
          available_steps.group_by { |step| step[:category] }
        end

        # Check if a step type is valid
        def valid_step_type?(type)
          STEP_TYPES.key?(type.to_s)
        end
      end
    end
  end
end
