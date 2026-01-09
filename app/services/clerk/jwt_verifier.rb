# frozen_string_literal: true

require 'jwt'
require 'net/http'
require 'json'

module Clerk
  class JwtVerifier
    JWKS_CACHE_TTL = 1.hour

    class << self
      def verify(token)
        new.verify(token)
      end
    end

    def verify(token)
      return nil if token.blank?

      # Decode without verification first to get kid (key ID)
      unverified = JWT.decode(token, nil, false)
      kid = unverified.dig(1, 'kid')

      return nil if kid.blank?

      # Get the public key from JWKS
      public_key = fetch_public_key(kid)
      return nil unless public_key

      # Verify the token
      payload, = JWT.decode(
        token,
        public_key,
        true,
        {
          algorithm: 'RS256',
          iss: clerk_issuer,
          verify_iss: true,
          verify_aud: false # Clerk doesn't always include aud
        }
      )

      payload
    rescue JWT::DecodeError => e
      Rails.logger.warn("[Clerk] JWT decode error: #{e.message}")
      nil
    rescue JWT::ExpiredSignature => e
      Rails.logger.warn("[Clerk] JWT expired: #{e.message}")
      nil
    rescue JWT::InvalidIssuerError => e
      Rails.logger.warn("[Clerk] JWT invalid issuer: #{e.message}")
      nil
    rescue StandardError => e
      Rails.logger.error("[Clerk] Unexpected error verifying JWT: #{e.message}")
      nil
    end

    private

    def fetch_public_key(kid)
      jwks = fetch_jwks
      key_data = jwks['keys']&.find { |k| k['kid'] == kid }

      return nil unless key_data

      JWT::JWK.new(key_data).public_key
    rescue StandardError => e
      Rails.logger.error("[Clerk] Error fetching public key: #{e.message}")
      nil
    end

    def fetch_jwks
      Rails.cache.fetch('clerk:jwks', expires_in: JWKS_CACHE_TTL) do
        jwks_url = "#{clerk_issuer}/.well-known/jwks.json"
        uri = URI(jwks_url)

        response = Net::HTTP.get_response(uri)

        unless response.is_a?(Net::HTTPSuccess)
          Rails.logger.error("[Clerk] Failed to fetch JWKS: #{response.code}")
          return { 'keys' => [] }
        end

        JSON.parse(response.body)
      end
    rescue StandardError => e
      Rails.logger.error("[Clerk] Error fetching JWKS: #{e.message}")
      { 'keys' => [] }
    end

    def clerk_issuer
      # Clerk issuer URL format: https://<subdomain>.clerk.accounts.dev
      # or for production: https://clerk.<your-domain>.com
      ENV.fetch('CLERK_ISSUER') do
        # Fallback: construct from publishable key if CLERK_ISSUER not set
        publishable_key = ENV['CLERK_PUBLISHABLE_KEY']
        if publishable_key&.start_with?('pk_')
          # Extract subdomain from publishable key (pk_test_xxx or pk_live_xxx)
          # The subdomain is base64 encoded in the key
          nil # Let it fail if not configured
        end
      end
    end
  end
end
