# frozen_string_literal: true

class BaseAPI < Grape::API
  format :json
  default_format :json

  # Error handling
  rescue_from ActiveRecord::RecordNotFound do |e|
    error!({ error: 'Resource not found', detail: e.message }, 404)
  end

  rescue_from ActiveRecord::RecordInvalid do |e|
    error!({ error: 'Validation failed', detail: e.record.errors.full_messages }, 422)
  end

  rescue_from Grape::Exceptions::ValidationErrors do |e|
    error!({ error: 'Validation failed', detail: e.full_messages }, 422)
  end

  rescue_from :all do |e|
    Rails.logger.error("API Error: #{e.message}\n#{e.backtrace.first(10).join("\n")}")

    if Rails.env.development? || Rails.env.test?
      error!({ error: e.class.name, detail: e.message, backtrace: e.backtrace.first(5) }, 500)
    else
      error!({ error: 'Internal server error' }, 500)
    end
  end

  helpers do
    # Get current user - always returns dev user (auth disabled)
    def current_user
      @current_user ||= find_or_create_dev_user
    end

    def authenticated?
      true # Auth disabled for now
    end

    def require_authentication!
      # Auth disabled - always allow
      true
    end

    private

    def find_or_create_dev_user
      User.find_or_create_by!(phone_number: '9999999999') do |user|
        user.name = 'Dev User'
        user.phone_verified = true
        user.session_token = 'dev_session_token'
        user.session_expires_at = 1.year.from_now
      end
    end
  end

  mount V1::Root
end
