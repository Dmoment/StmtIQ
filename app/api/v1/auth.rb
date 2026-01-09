# frozen_string_literal: true

module V1
  class Auth < Grape::API
    namespace :auth do
      desc 'Send OTP to phone number'
      params do
        requires :phone_number, type: String, desc: 'Phone number (10 digits)'
      end
      post :send_otp do
        phone = params[:phone_number].to_s.gsub(/\D/, '')

        # Basic validation
        unless phone.match?(/\A[0-9]{10}\z/)
          error!({ error: 'Invalid phone number. Please enter 10 digits.' }, 422)
        end

        # Find or create user
        user = User.find_or_initialize_by(phone_number: phone)
        user.save! if user.new_record?

        # Generate OTP (stored locally for dev mode)
        otp = user.generate_otp!

        # In development, return OTP for testing
        if Rails.env.development?
          Rails.logger.info("DEV MODE - OTP for #{phone}: #{otp}")
          return {
            success: true,
            message: 'OTP sent successfully',
            dev_otp: otp # Only in development!
          }
        end

        # In production, send via MSG91
        result = Msg91Service.send_otp(phone)

        if result[:success]
          { success: true, message: 'OTP sent successfully' }
        else
          error!({ error: result[:message] || 'Failed to send OTP' }, 422)
        end
      end

      desc 'Verify OTP and login'
      params do
        requires :phone_number, type: String, desc: 'Phone number'
        requires :otp, type: String, desc: 'OTP code'
      end
      post :verify_otp do
        phone = params[:phone_number].to_s.gsub(/\D/, '')
        otp = params[:otp].to_s

        user = User.find_by(phone_number: phone)

        unless user
          error!({ error: 'User not found. Please request OTP first.' }, 404)
        end

        # In development, verify locally
        if Rails.env.development?
          unless user.verify_otp!(otp)
            if user.otp_expired?
              error!({ error: 'OTP has expired. Please request a new one.' }, 422)
            else
              error!({ error: 'Invalid OTP. Please try again.' }, 422)
            end
          end
        else
          # In production, verify via MSG91
          result = Msg91Service.verify_otp(phone, otp)

          unless result[:success]
            error!({ error: result[:message] || 'Invalid OTP' }, 422)
          end

          # Mark user as verified and generate session
          user.update!(phone_verified: true, last_login_at: Time.current)
          user.generate_session_token!
        end

        {
          success: true,
          message: 'Login successful',
          token: user.session_token,
          user: {
            id: user.id,
            phone_number: user.phone_display,
            name: user.name,
            email: user.email,
            phone_verified: user.phone_verified
          }
        }
      end

      desc 'Resend OTP'
      params do
        requires :phone_number, type: String, desc: 'Phone number'
        optional :via, type: String, values: %w[sms voice], default: 'sms', desc: 'Delivery method'
      end
      post :resend_otp do
        phone = params[:phone_number].to_s.gsub(/\D/, '')

        user = User.find_by(phone_number: phone)
        unless user
          error!({ error: 'User not found. Please request OTP first.' }, 404)
        end

        # Generate new OTP
        otp = user.generate_otp!

        if Rails.env.development?
          Rails.logger.info("DEV MODE - Resent OTP for #{phone}: #{otp}")
          return {
            success: true,
            message: 'OTP resent successfully',
            dev_otp: otp
          }
        end

        # In production, resend via MSG91
        retry_type = params[:via] == 'voice' ? 'voice' : 'text'
        result = Msg91Service.resend_otp(phone, retry_type)

        if result[:success]
          { success: true, message: 'OTP resent successfully' }
        else
          error!({ error: result[:message] || 'Failed to resend OTP' }, 422)
        end
      end

      desc 'Logout - invalidate session'
      delete :logout do
        require_authentication!

        current_user.invalidate_session!

        { success: true, message: 'Logged out successfully' }
      end

      desc 'Get current user profile'
      get :me do
        require_authentication!

        {
          id: current_user.id,
          clerk_id: current_user.clerk_id,
          phone_number: current_user.phone_display,
          name: current_user.name,
          email: current_user.email,
          phone_verified: current_user.phone_verified,
          onboarded_at: current_user.onboarded_at,
          settings: current_user.settings
        }
      end

      desc 'Update user profile'
      params do
        optional :name, type: String, desc: 'Display name'
        optional :email, type: String, desc: 'Email address'
      end
      patch :me do
        require_authentication!

        current_user.update!(declared(params, include_missing: false))

        {
          id: current_user.id,
          phone_number: current_user.phone_display,
          name: current_user.name,
          email: current_user.email,
          phone_verified: current_user.phone_verified
        }
      end
    end
  end
end
