class BucketShare < ApplicationRecord
  belongs_to :bucket
  belongs_to :shared_by, class_name: "User"

  PERMISSIONS = %w[view download].freeze

  validates :shared_with_email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :access_token, presence: true, uniqueness: true
  validates :permission, inclusion: { in: PERMISSIONS }
  validates :shared_with_email, uniqueness: { scope: :bucket_id, message: "already has access to this bucket" }

  before_validation :generate_access_token, on: :create

  scope :active, -> { where(active: true) }
  scope :expired, -> { where("expires_at IS NOT NULL AND expires_at < ?", Time.current) }
  scope :valid, -> { active.where("expires_at IS NULL OR expires_at > ?", Time.current) }
  scope :for_email, ->(email) { where(shared_with_email: email.downcase) }

  def expired?
    expires_at.present? && expires_at < Time.current
  end

  def accessible?
    active? && !expired?
  end

  def record_access!
    update!(accessed_at: Time.current, access_count: access_count + 1)
  end

  def revoke!
    update!(active: false)
  end

  def share_url
    Rails.application.routes.url_helpers.shared_bucket_url(access_token: access_token)
  rescue StandardError
    nil
  end

  def can_download?
    permission == "download"
  end

  private

  def generate_access_token
    self.access_token ||= SecureRandom.urlsafe_base64(32)
  end
end
