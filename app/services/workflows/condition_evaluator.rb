# frozen_string_literal: true

module Workflows
  class ConditionEvaluator
    OPERATORS = {
      'equals' => ->(a, b) { a == b },
      'not_equals' => ->(a, b) { a != b },
      'greater_than' => ->(a, b) { a.to_f > b.to_f },
      'less_than' => ->(a, b) { a.to_f < b.to_f },
      'greater_than_or_equals' => ->(a, b) { a.to_f >= b.to_f },
      'less_than_or_equals' => ->(a, b) { a.to_f <= b.to_f },
      'contains' => ->(a, b) { a.to_s.include?(b.to_s) },
      'not_contains' => ->(a, b) { !a.to_s.include?(b.to_s) },
      'starts_with' => ->(a, b) { a.to_s.start_with?(b.to_s) },
      'ends_with' => ->(a, b) { a.to_s.end_with?(b.to_s) },
      'is_empty' => ->(a, _b) { a.blank? },
      'is_not_empty' => ->(a, _b) { a.present? },
      'in' => ->(a, b) { Array(b).include?(a) },
      'not_in' => ->(a, b) { !Array(b).include?(a) },
      'matches' => ->(a, b) { a.to_s.match?(Regexp.new(b.to_s)) }
    }.freeze

    attr_reader :conditions, :context

    def initialize(conditions, context)
      @conditions = conditions.with_indifferent_access
      @context = context.with_indifferent_access
    end

    def evaluate
      return true if conditions.blank?

      # Support both single condition and array of conditions
      if conditions[:rules].present?
        evaluate_group(conditions)
      elsif conditions[:field].present?
        evaluate_single(conditions)
      else
        true
      end
    end

    private

    # Evaluate a group of conditions with AND/OR logic
    def evaluate_group(group)
      rules = group[:rules] || []
      combinator = group[:combinator] || 'and'

      return true if rules.empty?

      results = rules.map do |rule|
        if rule[:rules].present?
          evaluate_group(rule)
        else
          evaluate_single(rule)
        end
      end

      case combinator.downcase
      when 'and'
        results.all?
      when 'or'
        results.any?
      else
        results.all?
      end
    end

    # Evaluate a single condition
    def evaluate_single(condition)
      field = condition[:field]
      operator = condition[:operator]
      value = condition[:value]

      return true if field.blank? || operator.blank?

      actual_value = get_field_value(field)
      compare(actual_value, operator, value)
    end

    # Get value from context using dot notation (e.g., "trigger_data.amount")
    def get_field_value(field)
      parts = field.to_s.split('.')
      result = context

      parts.each do |part|
        return nil unless result.respond_to?(:[])
        result = result[part] || result[part.to_sym]
      end

      result
    end

    # Compare values using the specified operator
    def compare(actual, operator, expected)
      comparator = OPERATORS[operator.to_s]
      return false unless comparator

      comparator.call(actual, expected)
    rescue StandardError => e
      Rails.logger.warn("Condition comparison failed: #{e.message}")
      false
    end
  end
end
