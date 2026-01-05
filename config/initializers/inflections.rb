# frozen_string_literal: true

# Be sure to restart your server when you modify this file.

# Add new inflection rules using the following format. Inflections
# are locale specific, and you may define rules for as many different
# locales as you wish. All of these examples are active by default:
ActiveSupport::Inflector.inflections(:en) do |inflect|
  # Handle API as an acronym
  inflect.acronym 'API'
end

# Configure Zeitwerk to handle API and AI naming
Rails.autoloaders.each do |autoloader|
  autoloader.inflector.inflect(
    "base_api" => "BaseAPI",
    "api" => "API",
    "ai_categorize_job" => "AICategorizeJob",
    "ai_categorizer" => "AICategorizer",
    "ml" => "ML"
  )
end
