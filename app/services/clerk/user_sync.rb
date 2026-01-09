# frozen_string_literal: true

module Clerk
  class UserSync
    def initialize(clerk_payload)
      @payload = clerk_payload
    end

    # Find existing user by clerk_id or create a new one
    def find_or_create_user
      user = User.find_by(clerk_id: clerk_id)
      return update_last_login(user) if user

      # Create new user from Clerk data
      User.create!(
        clerk_id: clerk_id,
        email: email,
        phone_number: phone_number,
        phone_verified: phone_verified?,
        name: full_name,
        auth_provider: 'clerk',
        last_login_at: Time.current
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.error("[Clerk] Failed to create user: #{e.message}")
      nil
    end

    # Sync existing user data from Clerk (for webhook updates)
    def sync_user(user)
      user.update!(
        email: email,
        phone_number: phone_number,
        phone_verified: phone_verified?,
        name: full_name.presence || user.name,
        last_login_at: Time.current
      )
      user
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.error("[Clerk] Failed to sync user: #{e.message}")
      user
    end

    private

    def clerk_id
      @payload['sub'] || @payload['id']
    end

    def email
      # Clerk JWT payload structure for email
      @payload['email'] ||
        @payload.dig('email_addresses', 0, 'email_address') ||
        @payload['primary_email_address']
    end

    def phone_number
      raw_phone = @payload['phone_number'] ||
                  @payload.dig('phone_numbers', 0, 'phone_number') ||
                  @payload['primary_phone_number']

      normalize_phone(raw_phone)
    end

    def phone_verified?
      # Check various Clerk payload structures
      @payload['phone_number_verified'] == true ||
        @payload.dig('phone_numbers', 0, 'verification', 'status') == 'verified' ||
        @payload['phone_verified'] == true
    end

    def full_name
      first_name = @payload['first_name']
      last_name = @payload['last_name']

      if first_name.present? || last_name.present?
        "#{first_name} #{last_name}".strip
      else
        @payload['name']
      end
    end

    def normalize_phone(phone)
      return nil if phone.blank?

      # Remove all non-digits
      digits = phone.to_s.gsub(/\D/, '')

      # Remove leading 0
      digits = digits[1..] if digits.start_with?('0')

      # Remove country code 91 for Indian numbers (keep 10-digit number)
      digits = digits[2..] if digits.start_with?('91') && digits.length > 10

      # Return nil if invalid length
      return nil unless digits.length >= 10 && digits.length <= 15

      digits
    end

    def update_last_login(user)
      user.update_column(:last_login_at, Time.current)
      user
    end
  end
end
