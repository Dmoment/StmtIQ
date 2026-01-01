# frozen_string_literal: true

# Shared authentication concern for API controllers
# Provides the same authentication logic used in Grape API
module ApiAuthentication
  extend ActiveSupport::Concern

  included do
    before_action :authenticate!
  end

  private

  def authenticate!
    @current_user = find_or_create_dev_user
  end

  def current_user
    @current_user
  end

  def find_or_create_dev_user
    User.find_or_create_by!(phone_number: '9999999999') do |user|
      user.name = 'Dev User'
      user.phone_verified = true
      user.session_token = 'dev_session_token'
      user.session_expires_at = 1.year.from_now
    end
  end
end
