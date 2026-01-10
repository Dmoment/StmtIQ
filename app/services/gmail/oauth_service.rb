# frozen_string_literal: true

require 'googleauth'
require 'google/apis/gmail_v1'

module Gmail
  # Handles Google OAuth2 authentication flow
  # SOLID: Single Responsibility - Only handles OAuth operations
  class OauthService
    # Gmail scopes needed for invoice fetching
    SCOPES = [
      'https://www.googleapis.com/auth/gmail.readonly',     # Read emails
      'https://www.googleapis.com/auth/userinfo.email'      # Get user email
    ].freeze

    class ConfigurationError < StandardError; end
    class TokenError < StandardError; end

    class << self
      # Generate the authorization URL for OAuth consent screen
      def authorization_url(state: nil)
        validate_configuration!

        # Build URL manually to ensure scopes are included correctly
        params = {
          client_id: ENV['GOOGLE_CLIENT_ID'],
          redirect_uri: ENV.fetch('GOOGLE_REDIRECT_URI', default_redirect_uri),
          response_type: 'code',
          scope: SCOPES.join(' '),
          access_type: 'offline',
          prompt: 'consent',
          state: state
        }.compact

        "https://accounts.google.com/o/oauth2/auth?#{params.to_query}"
      end

      # Exchange authorization code for tokens
      def exchange_code(code)
        validate_configuration!

        client = build_client
        client.code = code
        client.fetch_access_token!

        {
          access_token: client.access_token,
          refresh_token: client.refresh_token,
          expires_at: client.expires_at ? Time.at(client.expires_at) : 1.hour.from_now
        }
      rescue Signet::AuthorizationError => e
        raise TokenError, "Failed to exchange authorization code: #{e.message}"
      end

      # Refresh an expired access token
      def refresh_token(refresh_token)
        validate_configuration!

        client = build_client
        client.refresh_token = refresh_token
        client.fetch_access_token!

        {
          access_token: client.access_token,
          refresh_token: client.refresh_token || refresh_token,  # May return new refresh token
          expires_at: client.expires_at ? Time.at(client.expires_at) : 1.hour.from_now
        }
      rescue Signet::AuthorizationError => e
        raise TokenError, "Failed to refresh token: #{e.message}"
      end

      # Get user email from access token
      def get_user_email(access_token)
        service = build_gmail_service(access_token)
        profile = service.get_user_profile('me')
        profile.email_address
      rescue Google::Apis::AuthorizationError => e
        raise TokenError, "Failed to get user email: #{e.message}"
      end

      # Revoke access (disconnect)
      def revoke_token(access_token)
        uri = URI("https://oauth2.googleapis.com/revoke?token=#{access_token}")
        response = Net::HTTP.post(uri, '')
        response.code == '200'
      rescue StandardError
        false
      end

      # Check if Google OAuth is configured
      def configured?
        ENV['GOOGLE_CLIENT_ID'].present? && ENV['GOOGLE_CLIENT_SECRET'].present?
      end

      private

      def validate_configuration!
        unless configured?
          raise ConfigurationError, 'Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables.'
        end
      end

      def build_client
        Signet::OAuth2::Client.new(
          client_id: ENV['GOOGLE_CLIENT_ID'],
          client_secret: ENV['GOOGLE_CLIENT_SECRET'],
          authorization_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_credential_uri: 'https://oauth2.googleapis.com/token',
          redirect_uri: ENV.fetch('GOOGLE_REDIRECT_URI', default_redirect_uri),
          scope: SCOPES.join(' ')  # Signet requires space-separated string
        )
      end

      def build_gmail_service(access_token)
        service = Google::Apis::GmailV1::GmailService.new
        service.authorization = Signet::OAuth2::Client.new(
          access_token: access_token
        )
        service
      end

      def default_redirect_uri
        if Rails.env.development?
          'http://localhost:3000/app/gmail/callback'
        else
          "#{ENV.fetch('APP_HOST', 'https://stmtiq.com')}/app/gmail/callback"
        end
      end
    end
  end
end
