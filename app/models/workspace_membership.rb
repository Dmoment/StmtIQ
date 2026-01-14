# frozen_string_literal: true

class WorkspaceMembership < ApplicationRecord
  # Roles with hierarchy (higher index = more permissions)
  ROLES = %w[viewer member accountant admin owner].freeze
  STATUSES = %w[pending active suspended].freeze

  # Permission definitions per role
  ROLE_PERMISSIONS = {
    'viewer' => {
      view_transactions: true,
      view_invoices: true,
      view_accounts: true,
      view_statements: true,
      view_documents: true
    },
    'member' => {
      view_transactions: true,
      view_invoices: true,
      view_accounts: true,
      view_statements: true,
      view_documents: true,
      edit_transactions: true,
      upload_statements: true,
      create_rules: true,
      edit_documents: true
    },
    'accountant' => {
      view_transactions: true,
      view_invoices: true,
      view_accounts: true,
      view_statements: true,
      view_documents: true,
      export_data: true,
      view_reports: true
    },
    'admin' => {
      view_transactions: true,
      view_invoices: true,
      view_accounts: true,
      view_statements: true,
      view_documents: true,
      edit_transactions: true,
      upload_statements: true,
      create_rules: true,
      edit_documents: true,
      share_documents: true,
      export_data: true,
      view_reports: true,
      delete_data: true,
      invite_members: true,
      manage_members: true
    },
    'owner' => {
      view_transactions: true,
      view_invoices: true,
      view_accounts: true,
      view_statements: true,
      view_documents: true,
      edit_transactions: true,
      upload_statements: true,
      create_rules: true,
      edit_documents: true,
      share_documents: true,
      export_data: true,
      view_reports: true,
      delete_data: true,
      invite_members: true,
      manage_members: true,
      manage_workspace: true,
      delete_workspace: true,
      transfer_ownership: true
    }
  }.freeze

  # Associations
  belongs_to :workspace
  belongs_to :user

  # Validations
  validates :role, presence: true, inclusion: { in: ROLES }
  validates :status, inclusion: { in: STATUSES }
  validates :user_id, uniqueness: { scope: :workspace_id, message: 'is already a member of this workspace' }

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :pending, -> { where(status: 'pending') }
  scope :owners, -> { where(role: 'owner') }
  scope :admins, -> { where(role: %w[owner admin]) }

  # Callbacks
  before_save :update_last_accessed_at, if: :status_changed_to_active?

  # Instance Methods
  def owner?
    role == 'owner'
  end

  def admin?
    %w[owner admin].include?(role)
  end

  def can?(permission)
    return false unless status == 'active'

    # Check custom permissions first, then fall back to role defaults
    if permissions.present? && permissions.key?(permission.to_s)
      permissions[permission.to_s]
    else
      ROLE_PERMISSIONS.dig(role, permission) || false
    end
  end

  def role_level
    ROLES.index(role) || 0
  end

  def higher_role_than?(other_membership)
    role_level > other_membership.role_level
  end

  def activate!
    update!(status: 'active', joined_at: Time.current)
  end

  def suspend!
    update!(status: 'suspended')
  end

  def touch_last_accessed!
    update_column(:last_accessed_at, Time.current)
  end

  private

  def status_changed_to_active?
    status_changed? && status == 'active'
  end

  def update_last_accessed_at
    self.last_accessed_at = Time.current
  end
end
