# frozen_string_literal: true

class User < ApplicationRecord
  # Workspace Associations
  has_many :owned_workspaces, class_name: 'Workspace', foreign_key: :owner_id, dependent: :destroy
  has_many :workspace_memberships, dependent: :destroy
  has_many :workspaces, through: :workspace_memberships
  has_many :sent_invitations, class_name: 'WorkspaceInvitation', foreign_key: :invited_by_id, dependent: :destroy
  belongs_to :current_workspace, class_name: 'Workspace', optional: true

  # Resource Associations
  has_many :accounts, dependent: :destroy
  has_many :statements, dependent: :destroy
  has_many :transactions, dependent: :destroy
  has_many :user_rules, dependent: :destroy
  has_many :labeled_examples, dependent: :destroy
  has_many :invoices, dependent: :destroy
  has_many :gmail_connections, dependent: :destroy

  # Validations
  validates :clerk_id, uniqueness: true, allow_nil: true
  validates :phone_number,
            format: { with: /\A[0-9]{10,15}\z/, message: "must be a valid phone number" },
            uniqueness: { allow_nil: true },
            allow_nil: true
  validates :email, uniqueness: true, allow_nil: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }, if: -> { email.present? }
  validates :auth_provider, inclusion: { in: %w[clerk development legacy] }, allow_nil: true

  # Callbacks
  before_save :set_default_settings
  before_save :normalize_phone_number, if: -> { phone_number.present? && phone_number_changed? }
  after_create :create_personal_workspace

  # Scopes
  scope :verified, -> { where(phone_verified: true) }
  scope :clerk_users, -> { where.not(clerk_id: nil) }

  # OTP Methods
  def generate_otp!
    self.otp_code = SecureRandom.random_number(10**6).to_s.rjust(6, '0')
    self.otp_expires_at = 5.minutes.from_now
    save!
    otp_code
  end

  def verify_otp!(code)
    return false if otp_code.blank? || otp_expires_at.blank?
    return false if Time.current > otp_expires_at
    return false if otp_code != code

    self.otp_code = nil
    self.otp_expires_at = nil
    self.phone_verified = true
    self.last_login_at = Time.current
    generate_session_token!
    true
  end

  def otp_expired?
    otp_expires_at.nil? || Time.current > otp_expires_at
  end

  # Session Methods
  def generate_session_token!
    self.session_token = SecureRandom.urlsafe_base64(32)
    self.session_expires_at = 30.days.from_now
    save!
    session_token
  end

  def session_valid?
    session_token.present? && session_expires_at.present? && Time.current < session_expires_at
  end

  def invalidate_session!
    update!(session_token: nil, session_expires_at: nil)
  end

  # Instance methods
  def display_name
    name.presence || phone_display
  end

  def phone_display
    return "" unless phone_number
    # Format: +91 98765 43210
    "+91 #{phone_number[0..4]} #{phone_number[5..9]}"
  end

  # WhatsApp integration - returns phone in international format
  def whatsapp_number
    return nil unless phone_number.present? && phone_verified?

    # Format for WhatsApp API: +91XXXXXXXXXX
    "+91#{phone_number}"
  end

  def total_expenses(period: nil)
    scope = transactions.where(transaction_type: 'debit')
    scope = scope.where(transaction_date: period) if period
    scope.sum(:amount).abs
  end

  def total_income(period: nil)
    scope = transactions.where(transaction_type: 'credit')
    scope = scope.where(transaction_date: period) if period
    scope.sum(:amount)
  end

  private

  def normalize_phone_number
    # Remove all non-digits
    digits = phone_number.to_s.gsub(/\D/, '')

    # Remove leading 0 or country code 91
    digits = digits[1..] if digits.start_with?('0')
    digits = digits[2..] if digits.start_with?('91') && digits.length > 10

    self.phone_number = digits.presence
  end

  def set_default_settings
    self.settings ||= {
      'currency' => 'INR',
      'date_format' => 'DD/MM/YYYY',
      'ca_whatsapp' => nil,
      'auto_send_enabled' => false,
      'send_day' => 1
    }
  end

  def create_personal_workspace
    workspace = owned_workspaces.create!(
      name: "#{display_name}'s Workspace",
      workspace_type: 'personal'
    )
    update_column(:current_workspace_id, workspace.id)
    workspace
  end

  # Workspace Helper Methods
  def personal_workspace
    owned_workspaces.personal.first
  end

  def business_workspaces
    workspaces.business
  end

  def switch_workspace!(workspace)
    return false unless workspaces.include?(workspace)

    update!(current_workspace: workspace)
    workspace.membership_for(self)&.touch_last_accessed!
    true
  end

  def membership_in(workspace)
    workspace_memberships.find_by(workspace: workspace)
  end

  def role_in(workspace)
    membership_in(workspace)&.role
  end

  def can_in?(workspace, permission)
    membership_in(workspace)&.can?(permission) || false
  end

  def active_workspaces
    workspaces.active.joins(:workspace_memberships)
              .where(workspace_memberships: { status: 'active' })
  end
end
