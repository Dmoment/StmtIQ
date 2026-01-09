# frozen_string_literal: true

class WorkspaceInvitation < ApplicationRecord
  STATUSES = %w[pending accepted expired revoked].freeze
  EXPIRY_DURATION = 7.days

  # Associations
  belongs_to :workspace
  belongs_to :invited_by, class_name: 'User'

  # Validations
  validates :role, presence: true, inclusion: { in: WorkspaceMembership::ROLES - ['owner'] }
  validates :token, presence: true, uniqueness: true
  validates :expires_at, presence: true
  validates :status, inclusion: { in: STATUSES }
  validate :email_or_phone_required
  validate :not_already_member, on: :create

  # Scopes
  scope :pending, -> { where(status: 'pending') }
  scope :valid, -> { pending.where('expires_at > ?', Time.current) }
  scope :expired, -> { where('expires_at <= ? AND status = ?', Time.current, 'pending') }

  # Callbacks
  before_validation :generate_token, on: :create
  before_validation :set_expiry, on: :create

  # Class Methods
  def self.find_valid_by_token(token)
    valid.find_by(token: token)
  end

  def self.expire_old_invitations!
    expired.update_all(status: 'expired')
  end

  # Instance Methods
  def expired?
    expires_at <= Time.current || status == 'expired'
  end

  def valid_invitation?
    status == 'pending' && !expired?
  end

  def accept!(user)
    return false unless valid_invitation?
    return false if workspace.member?(user)

    transaction do
      workspace.workspace_memberships.create!(
        user: user,
        role: role,
        status: 'active',
        joined_at: Time.current
      )
      update!(status: 'accepted', accepted_at: Time.current)
    end

    true
  rescue ActiveRecord::RecordInvalid
    false
  end

  def revoke!
    update!(status: 'revoked')
  end

  def resend!
    return false unless status == 'pending'

    update!(
      token: SecureRandom.urlsafe_base64(32),
      expires_at: EXPIRY_DURATION.from_now
    )
    # TODO: Send notification (email/SMS)
    true
  end

  def invitation_url
    # TODO: Generate proper URL based on environment
    "/invitations/#{token}"
  end

  private

  def generate_token
    self.token ||= SecureRandom.urlsafe_base64(32)
  end

  def set_expiry
    self.expires_at ||= EXPIRY_DURATION.from_now
  end

  def email_or_phone_required
    if email.blank? && phone_number.blank?
      errors.add(:base, 'Email or phone number is required')
    end
  end

  def not_already_member
    return if workspace.blank?

    if email.present?
      existing_user = User.find_by(email: email)
      if existing_user && workspace.member?(existing_user)
        errors.add(:email, 'is already a member of this workspace')
      end
    end

    if phone_number.present?
      existing_user = User.find_by(phone_number: phone_number)
      if existing_user && workspace.member?(existing_user)
        errors.add(:phone_number, 'is already a member of this workspace')
      end
    end
  end
end
