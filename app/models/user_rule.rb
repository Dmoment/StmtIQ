# frozen_string_literal: true

class UserRule < ApplicationRecord
  include WorkspaceScoped

  # Associations
  belongs_to :user
  belongs_to :category
  belongs_to :subcategory, optional: true
  belongs_to :source_transaction, class_name: 'Transaction', optional: true

  # Validations
  validates :pattern, presence: true
  validates :pattern, uniqueness: { scope: :user_id, message: 'already exists for this user' }
  validates :pattern_type, inclusion: { in: %w[keyword regex exact] }
  validates :match_field, inclusion: { in: %w[description normalized amount_range] }
  validate :validate_regex_pattern, if: -> { pattern_type == 'regex' }
  validate :validate_amount_range, if: -> { match_field == 'amount_range' }

  # Scopes
  scope :active, -> { where(is_active: true) }
  scope :by_priority, -> { order(priority: :desc, match_count: :desc) }
  scope :for_user, ->(user) { where(user: user).active.by_priority }

  # Callbacks
  before_save :normalize_pattern

  # Match a transaction description against this rule
  # Returns confidence score (0.0 - 1.0) or nil if no match
  def match?(text)
    return nil unless is_active?
    return match_amount_range? if match_field == 'amount_range'

    text_to_match = text.to_s.downcase.strip
    return nil if text_to_match.blank?

    case pattern_type
    when 'exact'
      text_to_match == pattern.downcase ? 0.98 : nil
    when 'keyword'
      match_keyword?(text_to_match)
    when 'regex'
      match_regex?(text_to_match)
    end
  end

  # Record a successful match
  def record_match!
    increment!(:match_count)
    update_column(:last_matched_at, Time.current)
  end

  # Create a rule from user feedback (when they correct a category/subcategory)
  def self.create_from_feedback!(user:, transaction:, category:, subcategory: nil)
    # Use normalized description as the pattern
    normalized = ML::NormalizationService.normalize(
      transaction.description || transaction.original_description || ''
    )
    return nil if normalized.blank?

    # Extract key words (first 3 meaningful words)
    pattern = normalized.split(' ').first(3).join(' ')
    return nil if pattern.blank?

    # Create or update the rule
    rule = find_or_initialize_by(user: user, pattern: pattern)
    rule.assign_attributes(
      category: category,
      subcategory: subcategory,
      pattern_type: 'keyword',
      match_field: 'normalized',
      source_transaction: transaction,
      source: 'feedback',
      is_active: true
    )
    rule.save!
    rule
  rescue ActiveRecord::RecordNotUnique
    # Rule already exists, update it
    rule = find_by(user: user, pattern: pattern)
    rule&.update!(category: category, subcategory: subcategory, source: 'feedback', is_active: true)
    rule
  end

  private

  def match_keyword?(text)
    # Use word boundary matching for keywords
    pattern_words = pattern.downcase.split(' ')

    # All words must be present
    matched = pattern_words.all? do |word|
      text.match?(/\b#{Regexp.escape(word)}\b/)
    end

    return nil unless matched

    # Confidence based on pattern length and match count
    base_confidence = 0.85
    boost = [match_count * 0.01, 0.10].min # Up to 10% boost from match history
    [base_confidence + boost, 0.98].min
  end

  def match_regex?(text)
    return nil unless text.match?(Regexp.new(pattern, Regexp::IGNORECASE))

    0.90 # Regex matches get high confidence
  rescue RegexpError
    nil
  end

  def match_amount_range?
    return nil unless amount_min.present? || amount_max.present?

    # This would need the transaction amount passed in
    # For now, return nil - amount matching handled separately
    nil
  end

  def normalize_pattern
    self.pattern = pattern.to_s.strip.downcase
  end

  def validate_regex_pattern
    Regexp.new(pattern)
  rescue RegexpError => e
    errors.add(:pattern, "is not a valid regex: #{e.message}")
  end

  def validate_amount_range
    return unless amount_min.present? && amount_max.present?

    if amount_min > amount_max
      errors.add(:amount_min, 'must be less than or equal to amount_max')
    end
  end
end
