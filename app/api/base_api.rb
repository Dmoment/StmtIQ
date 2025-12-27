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
    # Get current user - auto-creates dev user in development
    def current_user
      @current_user ||= authenticate_user!
    end

    def authenticate_user!
      # In development, auto-create and return a dev user (no auth required)
      if Rails.env.development?
        return find_or_create_dev_user
      end

      # In production, require proper authentication
      token = extract_token
      return nil unless token

      payload = decode_token(token)
      return nil unless payload

      find_or_create_user(payload)
    rescue StandardError => e
      Rails.logger.error("Authentication error: #{e.message}")
      nil
    end

    def authenticated?
      current_user.present?
    end

    def require_authentication!
      # Skip auth check in development
      return if Rails.env.development?

      error!({ error: 'Unauthorized' }, 401) unless authenticated?
    end

    private

    def find_or_create_dev_user
      User.find_or_create_by!(auth0_id: 'dev_user') do |user|
        user.email = 'dev@stmtiq.local'
        user.name = 'Dev User'
      end
    end

    def extract_token
      auth_header = headers['Authorization']
      return nil unless auth_header

      match = auth_header.match(/^Bearer (.+)$/)
      match&.[](1)
    end

    def decode_token(token)
      # For development, allow a simple token format
      if Rails.env.development? && token.start_with?('dev_')
        return { 'sub' => token, 'email' => 'dev@example.com', 'name' => 'Dev User' }
      end

      # Production: Verify Auth0 JWT
      JWT.decode(
        token,
        nil,
        true,
        {
          algorithm: 'RS256',
          iss: "https://#{ENV['AUTH0_DOMAIN']}/",
          aud: ENV['AUTH0_AUDIENCE'],
          verify_iss: true,
          verify_aud: true,
          jwks: jwks_loader
        }
      ).first
    end

    def jwks_loader
      ->(options) {
        @jwks ||= fetch_jwks
        @jwks = fetch_jwks if options[:invalidate]
        @jwks
      }
    end

    def fetch_jwks
      jwks_uri = URI("https://#{ENV['AUTH0_DOMAIN']}/.well-known/jwks.json")
      response = Net::HTTP.get(jwks_uri)
      JSON.parse(response)
    end

    def find_or_create_user(payload)
      User.find_or_create_by!(auth0_id: payload['sub']) do |user|
        user.email = payload['email']
        user.name = payload['name'] || payload['nickname']
        user.avatar_url = payload['picture']
      end
    end
  end

  mount V1::Root
end
