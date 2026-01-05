# frozen_string_literal: true

class LabeledExample < ApplicationRecord
  # Associations
  belongs_to :user
  belongs_to :category
  belongs_to :source_transaction, class_name: 'Transaction', foreign_key: 'transaction_id', optional: true

  # Validations
  validates :description, presence: true
  validates :normalized_description, uniqueness: { scope: :user_id, allow_blank: true }

  # Callbacks
  before_validation :set_normalized_description

  # Scopes
  scope :with_embedding, -> { where.not(embedding: nil) }
  scope :for_user, ->(user) { where(user: user) }
  scope :for_category, ->(category) { where(category: category) }

  # Create a labeled example from user feedback
  def self.create_from_feedback!(user:, transaction:, category:)
    normalized = ML::NormalizationService.normalize(
      transaction.description || transaction.original_description || ''
    )

    example = find_or_initialize_by(
      user: user,
      normalized_description: normalized
    )

    example.assign_attributes(
      category: category,
      source_transaction: transaction,
      description: transaction.description || transaction.original_description,
      amount: transaction.amount,
      transaction_type: transaction.transaction_type,
      source: 'user_feedback'
    )

    # Copy embedding from transaction if available
    if transaction.embedding.present?
      example.embedding = transaction.embedding
    end

    example.save!
    example
  rescue ActiveRecord::RecordNotUnique
    # Already exists, update category
    example = find_by(user: user, normalized_description: normalized)
    example&.update!(category: category, source: 'user_feedback')
    example
  end

  # Generate embedding for this example (async)
  def generate_embedding!
    return if embedding.present?
    return if normalized_description.blank?
    return unless ENV['OPENAI_API_KEY'].present?

    # Enqueue job to generate embedding
    ML::GenerateLabeledExampleEmbeddingJob.perform_later(id)
  end

  private

  def set_normalized_description
    self.normalized_description ||= ML::NormalizationService.normalize(description.to_s)
  end
end
