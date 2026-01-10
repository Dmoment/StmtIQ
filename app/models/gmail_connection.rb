# frozen_string_literal: true

class GmailConnection < ApplicationRecord
  acts_as_tenant :workspace

  # ============================================
  # Associations
  # ============================================
  belongs_to :user
  has_many :invoices, ->(connection) { where(source: 'gmail', gmail_message_id: connection.synced_message_ids) },
           class_name: 'Invoice', foreign_key: :user_id, primary_key: :user_id

  # ============================================
  # Validations
  # ============================================
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :email, uniqueness: { scope: :user_id, message: 'is already connected' }
  validates :status, presence: true, inclusion: { in: %w[pending active syncing error disconnected] }

  # ============================================
  # Encryption (for sensitive tokens)
  # ============================================
  encrypts :access_token, deterministic: false
  encrypts :refresh_token, deterministic: false

  # ============================================
  # Scopes
  # ============================================
  scope :active, -> { where(status: 'active') }
  scope :enabled, -> { where(sync_enabled: true) }
  scope :needs_sync, -> { active.enabled.where('last_sync_at IS NULL OR last_sync_at < ?', 1.hour.ago) }
  scope :with_valid_token, -> { where('token_expires_at > ?', Time.current) }

  # ============================================
  # Status Management
  # ============================================

  def active?
    status == 'active'
  end

  def connected?
    access_token.present? && refresh_token.present?
  end

  def token_expired?
    return true unless token_expires_at

    token_expires_at <= Time.current
  end

  def token_expiring_soon?
    return true unless token_expires_at

    token_expires_at <= 5.minutes.from_now
  end

  def mark_active!
    update!(status: 'active', error_message: nil)
  end

  def mark_syncing!
    update!(status: 'syncing')
  end

  def mark_error!(message)
    update!(status: 'error', error_message: message)
  end

  def mark_disconnected!
    update!(
      status: 'disconnected',
      access_token: nil,
      refresh_token: nil,
      token_expires_at: nil
    )
  end

  def update_tokens!(access_token:, refresh_token: nil, expires_at:)
    attrs = {
      access_token: access_token,
      token_expires_at: expires_at,
      status: 'active',
      error_message: nil
    }
    attrs[:refresh_token] = refresh_token if refresh_token.present?
    update!(attrs)
  end

  def record_sync!(history_id: nil)
    attrs = { last_sync_at: Time.current }
    attrs[:last_history_id] = history_id if history_id.present?
    update!(attrs)
  end

  # ============================================
  # Helper Methods
  # ============================================

  def synced_message_ids
    # This would be populated from the Gmail sync service
    # For now, fetch from invoices
    user.invoices.from_gmail.where.not(gmail_message_id: nil).pluck(:gmail_message_id)
  end

  def invoice_count
    user.invoices.from_gmail.count
  end

  def display_status
    case status
    when 'active' then sync_enabled? ? 'Connected' : 'Paused'
    when 'syncing' then 'Syncing...'
    when 'error' then 'Error'
    when 'disconnected' then 'Disconnected'
    else 'Pending'
    end
  end
end
