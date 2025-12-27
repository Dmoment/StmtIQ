# frozen_string_literal: true

class BankTemplate < ApplicationRecord
  # Constants
  ACCOUNT_TYPES = %w[savings current credit_card salary fd_rd loan].freeze
  FILE_FORMATS = %w[csv xls xlsx pdf].freeze
  TEMPLATES_CONFIG_PATH = Rails.root.join('config', 'bank_templates').freeze

  # Validations
  validates :bank_name, presence: true
  validates :bank_code, presence: true
  validates :account_type, presence: true, inclusion: { in: ACCOUNT_TYPES }
  validates :file_format, presence: true, inclusion: { in: FILE_FORMATS }
  validates :bank_code, uniqueness: { scope: [:account_type, :file_format] }

  # Scopes
  scope :active, -> { where(is_active: true) }
  scope :ordered, -> { order(:display_order, :bank_name) }
  scope :by_bank, ->(code) { where(bank_code: code) }

  # ============================================
  # Template Loading from YAML
  # ============================================

  # Load all templates from YAML config files
  def self.seed_templates!
    templates_dir = TEMPLATES_CONFIG_PATH

    unless templates_dir.exist?
      Rails.logger.warn("Bank templates directory not found: #{templates_dir}")
      return 0
    end

    count = 0
    Dir.glob(templates_dir.join('*.yml')).each do |file_path|
      count += load_templates_from_file(file_path)
    end

    Rails.logger.info("Seeded #{count} bank templates from YAML files")
    count
  end

  # Load templates from a single YAML file
  def self.load_templates_from_file(file_path)
    config = YAML.load_file(file_path, permitted_classes: [Symbol])
    return 0 unless config && config['templates']

    bank_name = config['bank_name']
    bank_code = config['bank_code']

    count = 0
    config['templates'].each do |template_config|
      template = find_or_initialize_by(
        bank_code: bank_code,
        account_type: template_config['account_type'],
        file_format: template_config['file_format']
      )

      template.assign_attributes(
        bank_name: bank_name,
        logo_url: config['logo'],
        description: template_config['description'],
        display_order: template_config['display_order'] || 0,
        column_mappings: template_config['column_mappings'] || {},
        parser_config: build_parser_config(template_config),
        is_active: true
      )

      if template.save
        count += 1
      else
        Rails.logger.warn("Failed to save template: #{template.errors.full_messages}")
      end
    end

    count
  rescue => e
    Rails.logger.error("Error loading templates from #{file_path}: #{e.message}")
    0
  end

  def self.build_parser_config(template_config)
    config = template_config['parser_config'] || {}
    # Store the parser class in config for dynamic loading
    config['parser_class'] = template_config['parser_class'] if template_config['parser_class']
    config
  end

  # ============================================
  # Parser Resolution
  # ============================================

  # Get the parser class for this template
  def parser_class
    # First, check if a specific parser class is configured
    class_name = parser_config['parser_class']

    if class_name.present?
      class_name.constantize
    else
      # Fallback to convention-based parser lookup
      resolve_parser_by_convention
    end
  rescue NameError => e
    Rails.logger.warn("Parser class not found: #{e.message}, falling back to GenericParser")
    BankParsers::GenericParser
  end

  def resolve_parser_by_convention
    # Try bank-specific parser first: BankParsers::Icici::CurrentParser
    namespaced_class = "BankParsers::#{bank_code.camelize}::#{account_type.camelize}Parser"
    return namespaced_class.constantize if Object.const_defined?(namespaced_class)

    # Try simple bank parser: BankParsers::IciciParser
    simple_class = "BankParsers::#{bank_code.camelize}Parser"
    return simple_class.constantize if Object.const_defined?(simple_class)

    # Fallback to generic
    BankParsers::GenericParser
  rescue NameError
    BankParsers::GenericParser
  end

  # ============================================
  # Display Helpers
  # ============================================

  def display_name
    "#{bank_name} - #{account_type.titleize} (#{file_format.upcase})"
  end

  def short_name
    "#{account_type.titleize} (#{file_format.upcase})"
  end

  # ============================================
  # Grouped Data for UI
  # ============================================

  def self.grouped_by_bank
    active.ordered.group_by(&:bank_code).transform_values do |templates|
      {
        bank_name: templates.first.bank_name,
        templates: templates.map do |t|
          {
            id: t.id,
            account_type: t.account_type,
            file_format: t.file_format,
            description: t.description,
            display_name: t.display_name
          }
        end
      }
    end
  end

  # ============================================
  # Configuration Accessors
  # ============================================

  def date_formats
    parser_config['date_formats'] || ['%d/%m/%Y']
  end

  def header_indicators
    parser_config['header_indicators'] || []
  end

  def skip_patterns
    parser_config['skip_patterns'] || []
  end

  def encoding
    parser_config['encoding'] || 'UTF-8'
  end
end
