# frozen_string_literal: true

class Workspace < ApplicationRecord
  # Workspace Types
  TYPES = %w[personal business group].freeze
  PLANS = %w[free starter professional enterprise].freeze

  # Associations
  belongs_to :owner, class_name: 'User'
  has_many :workspace_memberships, dependent: :destroy
  has_many :members, through: :workspace_memberships, source: :user
  has_many :workspace_invitations, dependent: :destroy

  # Resource associations
  has_many :accounts, dependent: :destroy
  has_many :statements, dependent: :destroy
  has_many :transactions, dependent: :destroy
  has_many :user_rules, dependent: :destroy
  has_many :labeled_examples, dependent: :destroy
  has_many :invoices, dependent: :destroy
  has_many :gmail_connections, dependent: :destroy

  # Sales Invoice associations
  has_one :business_profile, dependent: :destroy
  has_many :clients, dependent: :destroy
  has_many :sales_invoices, dependent: :destroy
  has_many :recurring_invoices, dependent: :destroy

  # Document Storage associations
  has_many :folders, dependent: :destroy
  has_many :documents, dependent: :destroy
  has_many :buckets, dependent: :destroy

  # Workflow associations
  has_many :workflows, dependent: :destroy
  has_many :workflow_executions, dependent: :destroy

  # Validations
  validates :name, presence: true, length: { maximum: 100 }
  validates :slug, presence: true, uniqueness: true, length: { maximum: 50 }
  validates :workspace_type, presence: true, inclusion: { in: TYPES }
  validates :plan, inclusion: { in: PLANS }, allow_nil: true

  # Scopes
  scope :active, -> { where(is_active: true, deleted_at: nil) }
  scope :personal, -> { where(workspace_type: 'personal') }
  scope :business, -> { where(workspace_type: 'business') }
  scope :group_type, -> { where(workspace_type: 'group') }

  # Callbacks
  before_validation :generate_slug, on: :create
  after_create :add_owner_as_member

  # Instance Methods
  def personal?
    workspace_type == 'personal'
  end

  def business?
    workspace_type == 'business'
  end

  def group?
    workspace_type == 'group'
  end

  def soft_delete!
    update!(deleted_at: Time.current, is_active: false)
  end

  def restore!
    update!(deleted_at: nil, is_active: true)
  end

  def deleted?
    deleted_at.present?
  end

  def membership_for(user)
    workspace_memberships.find_by(user: user)
  end

  def role_for(user)
    membership_for(user)&.role
  end

  def member?(user)
    workspace_memberships.exists?(user: user, status: 'active')
  end

  def owner?(user)
    owner_id == user.id
  end

  def can_invite?(user)
    membership = membership_for(user)
    return false unless membership

    %w[owner admin].include?(membership.role)
  end

  private

  def generate_slug
    return if slug.present?

    base_slug = name.parameterize
    self.slug = base_slug

    counter = 1
    while Workspace.exists?(slug: slug)
      self.slug = "#{base_slug}-#{counter}"
      counter += 1
    end
  end

  def add_owner_as_member
    workspace_memberships.create!(
      user: owner,
      role: 'owner',
      status: 'active',
      joined_at: Time.current
    )
  end
end
