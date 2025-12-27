# frozen_string_literal: true

class Msg91Service
  BASE_URL = "https://control.msg91.com/api/v5"
  OTP_URL = "https://control.msg91.com/api/v5/otp"

  class << self
    def send_otp(phone_number)
      # Normalize phone number (ensure it has country code)
      normalized_phone = normalize_phone(phone_number)

      response = connection.post("#{OTP_URL}") do |req|
        req.params = {
          template_id: template_id,
          mobile: normalized_phone,
          authkey: auth_key,
          otp_length: otp_length,
          otp_expiry: otp_expiry_minutes
        }
      end

      result = parse_response(response)

      if result[:success]
        Rails.logger.info("MSG91: OTP sent successfully to #{masked_phone(normalized_phone)}")
      else
        Rails.logger.error("MSG91: Failed to send OTP - #{result[:message]}")
      end

      result
    end

    def verify_otp(phone_number, otp_code)
      normalized_phone = normalize_phone(phone_number)

      response = connection.get("#{OTP_URL}/verify") do |req|
        req.params = {
          mobile: normalized_phone,
          otp: otp_code,
          authkey: auth_key
        }
      end

      result = parse_response(response)

      if result[:success]
        Rails.logger.info("MSG91: OTP verified successfully for #{masked_phone(normalized_phone)}")
      else
        Rails.logger.warn("MSG91: OTP verification failed for #{masked_phone(normalized_phone)} - #{result[:message]}")
      end

      result
    end

    def resend_otp(phone_number, retry_type = "text")
      # retry_type can be: "text", "voice"
      normalized_phone = normalize_phone(phone_number)

      response = connection.get("#{OTP_URL}/retry") do |req|
        req.params = {
          mobile: normalized_phone,
          authkey: auth_key,
          retrytype: retry_type
        }
      end

      parse_response(response)
    end

    private

    def connection
      @connection ||= Faraday.new do |f|
        f.request :url_encoded
        f.response :json
        f.adapter Faraday.default_adapter
      end
    end

    def parse_response(response)
      body = response.body

      if body.is_a?(String)
        body = JSON.parse(body) rescue { "type" => "error", "message" => body }
      end

      success = body["type"] == "success" || response.status == 200 && body["type"] != "error"

      {
        success: success,
        message: body["message"] || body["type"],
        data: body
      }
    end

    def normalize_phone(phone_number)
      # Remove all non-digits
      digits = phone_number.to_s.gsub(/\D/, "")

      # If starts with 0, remove it
      digits = digits[1..] if digits.start_with?("0")

      # Add India country code if not present
      digits = "91#{digits}" unless digits.start_with?("91") && digits.length > 10

      digits
    end

    def masked_phone(phone_number)
      return "" unless phone_number
      "#{phone_number[0..3]}****#{phone_number[-4..]}"
    end

    def auth_key
      ENV.fetch("MSG91_AUTH_KEY") do
        raise "MSG91_AUTH_KEY environment variable is required"
      end
    end

    def template_id
      ENV.fetch("MSG91_TEMPLATE_ID") do
        raise "MSG91_TEMPLATE_ID environment variable is required"
      end
    end

    def otp_length
      ENV.fetch("MSG91_OTP_LENGTH", "6").to_i
    end

    def otp_expiry_minutes
      ENV.fetch("MSG91_OTP_EXPIRY", "5").to_i
    end
  end
end
