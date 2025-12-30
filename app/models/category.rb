# frozen_string_literal: true

class Category < ApplicationRecord
  # Self-referential for hierarchical categories
  belongs_to :parent, class_name: 'Category', optional: true
  has_many :children, class_name: 'Category', foreign_key: 'parent_id', dependent: :nullify

  # Transaction associations
  has_many :transactions, dependent: :nullify
  has_many :ai_categorized_transactions, class_name: 'Transaction', foreign_key: 'ai_category_id', dependent: :nullify

  # Validations
  validates :name, presence: true, uniqueness: { scope: :parent_id }
  validates :slug, presence: true, uniqueness: true

  # Callbacks
  before_validation :generate_slug

  # Ransack configuration
  self.whitelisted_ransackable_attributes = %w[
    name
    slug
    icon
    color
    description
    is_system
    parent_id
  ]

  self.whitelisted_ransackable_associations = %w[
    parent
    children
    transactions
  ]

  self.whitelisted_ransackable_scopes = %w[
    system
    custom
    root
  ]

  # Scopes
  scope :system, -> { where(is_system: true) }
  scope :custom, -> { where(is_system: [false, nil]) }
  scope :root, -> { where(parent_id: nil) }

  # Default system categories
  SYSTEM_CATEGORIES = {
    'food' => { icon: 'utensils', color: '#f97316', description: 'Food & Dining' },
    'transport' => { icon: 'car', color: '#3b82f6', description: 'Transportation & Travel' },
    'shopping' => { icon: 'shopping-bag', color: '#ec4899', description: 'Shopping & Retail' },
    'utilities' => { icon: 'smartphone', color: '#10b981', description: 'Bills & Utilities' },
    'housing' => { icon: 'home', color: '#8b5cf6', description: 'Rent & Housing' },
    'health' => { icon: 'heart', color: '#ef4444', description: 'Health & Medical' },
    'entertainment' => { icon: 'gamepad', color: '#6366f1', description: 'Entertainment' },
    'business' => { icon: 'briefcase', color: '#64748b', description: 'Business & Professional' },
    'transfer' => { icon: 'arrow-right-left', color: '#0ea5e9', description: 'Bank Transfers' },
    'salary' => { icon: 'wallet', color: '#22c55e', description: 'Salary & Income' },
    'investment' => { icon: 'trending-up', color: '#a855f7', description: 'Investments' },
    'emi' => { icon: 'credit-card', color: '#f59e0b', description: 'EMI & Loan Payments' },
    'tax' => { icon: 'landmark', color: '#71717a', description: 'Tax & Government' },
    'other' => { icon: 'help-circle', color: '#94a3b8', description: 'Uncategorized' }
  }.freeze

  class << self
    def seed_system_categories!
      SYSTEM_CATEGORIES.each do |slug, attrs|
        find_or_create_by!(slug: slug) do |cat|
          cat.name = slug.titleize
          cat.icon = attrs[:icon]
          cat.color = attrs[:color]
          cat.description = attrs[:description]
          cat.is_system = true
        end
      end
    end
  end

  private

  def generate_slug
    self.slug ||= name&.parameterize
  end
end
