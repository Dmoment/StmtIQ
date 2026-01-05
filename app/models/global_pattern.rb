# frozen_string_literal: true

# GlobalPattern stores patterns learned across ALL users
# When a pattern is seen from multiple users with the same category,
# it becomes "verified" and is used for all future categorizations
#
# This enables cross-user learning:
# - User A's Blinkit transaction → LLM → food → GlobalPattern created
# - User B's Blinkit transaction → Matches GlobalPattern → No LLM needed!
#
class GlobalPattern < ApplicationRecord
  belongs_to :category

  # Verification thresholds
  MIN_USERS_FOR_VERIFICATION = 2 # Must be seen by at least 2 users
  MIN_AGREEMENT_RATE = 0.8 # 80% of users must agree on category

  # Scopes
  scope :verified, -> { where(is_verified: true) }
  scope :unverified, -> { where(is_verified: false) }
  scope :by_pattern, ->(pattern) { where(pattern: pattern) }
  scope :for_matching, -> { verified.order(match_count: :desc) }

  # Validations
  validates :pattern, presence: true, length: { minimum: 3 }
  validates :pattern, uniqueness: { scope: :category_id }

  # Record a new occurrence of this pattern
  # Returns the pattern (created or updated)
  def self.record_pattern(pattern:, category:, user:, source: 'llm_auto')
    pattern = pattern.to_s.downcase.strip
    return nil if pattern.blank? || pattern.length < 3

    # Find or create pattern for this category
    global_pattern = find_or_initialize_by(pattern: pattern, category: category)

    # Track user contribution
    user_ids = global_pattern.user_ids || []
    is_new_user = !user_ids.include?(user.id)

    if global_pattern.new_record?
      # New pattern
      global_pattern.assign_attributes(
        source: source,
        user_ids: [user.id],
        occurrence_count: 1,
        user_count: 1,
        agreement_count: 1
      )
    else
      # Existing pattern - update counts
      global_pattern.occurrence_count += 1

      if is_new_user
        global_pattern.user_ids = user_ids + [user.id]
        global_pattern.user_count += 1
        global_pattern.agreement_count += 1 # They agreed on this category
      end
    end

    global_pattern.save!
    global_pattern.check_verification!

    global_pattern
  rescue ActiveRecord::RecordNotUnique
    # Race condition - pattern was created by another process
    find_by(pattern: pattern, category: category)
  rescue => e
    Rails.logger.warn("GlobalPattern.record_pattern failed: #{e.message}")
    nil
  end

  # Check if a different category was suggested for this pattern
  # This helps track disagreements
  def self.record_disagreement(pattern:, suggested_category:, user:)
    pattern = pattern.to_s.downcase.strip

    # Find existing patterns with this text
    existing = where(pattern: pattern).where.not(category: suggested_category)

    existing.each do |gp|
      # Don't count same user twice
      next if gp.user_ids&.include?(user.id)

      # This user disagrees with the existing category
      # Don't increment agreement, but do track occurrence
      gp.increment!(:occurrence_count)
      gp.check_verification!
    end
  end

  # Check if this pattern should be verified
  def check_verification!
    return if is_verified?

    # Must have minimum users
    return if user_count < MIN_USERS_FOR_VERIFICATION

    # Must have high agreement rate
    agreement_rate = agreement_count.to_f / user_count
    return if agreement_rate < MIN_AGREEMENT_RATE

    # Verify!
    update!(
      is_verified: true,
      verified_at: Time.current
    )

    Rails.logger.info(
      "GlobalPattern ##{id} verified: '#{pattern}' -> #{category.slug} " \
      "(#{user_count} users, #{(agreement_rate * 100).round}% agreement)"
    )
  end

  # Record a match
  def record_match!
    update_columns(
      match_count: match_count + 1,
      last_matched_at: Time.current
    )
  end

  # Check if pattern matches text
  def matches?(text)
    return false if text.blank?

    text = text.downcase
    case pattern_type
    when 'exact'
      text == pattern
    when 'prefix'
      text.start_with?(pattern)
    when 'suffix'
      text.end_with?(pattern)
    else # keyword (default)
      text.include?(pattern)
    end
  end
end
