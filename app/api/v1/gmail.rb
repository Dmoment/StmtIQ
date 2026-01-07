# frozen_string_literal: true

module V1
  class Gmail < Grape::API
    namespace :gmail do
      # ============================================
      # OAuth Flow
      # ============================================

      desc 'Get Gmail OAuth authorization URL'
      get :auth do
        require_authentication!

        unless ::Gmail::OauthService.configured?
          error!({ error: 'Gmail integration not configured' }, 503)
        end

        # Generate state token for CSRF protection
        state = SecureRandom.urlsafe_base64(32)

        # Store state in user session or cache
        Rails.cache.write("gmail_oauth_state:#{current_user.id}", state, expires_in: 10.minutes)

        {
          authorization_url: ::Gmail::OauthService.authorization_url(state: state),
          state: state
        }
      end

      desc 'Handle Gmail OAuth callback'
      params do
        requires :code, type: String, desc: 'Authorization code from Google'
        requires :state, type: String, desc: 'CSRF state token'
      end
      get :callback do
        require_authentication!

        # Verify state token
        stored_state = Rails.cache.read("gmail_oauth_state:#{current_user.id}")
        unless stored_state && ActiveSupport::SecurityUtils.secure_compare(stored_state, params[:state])
          error!({ error: 'Invalid state token. Please try again.' }, 422)
        end

        # Clear state token
        Rails.cache.delete("gmail_oauth_state:#{current_user.id}")

        begin
          # Exchange code for tokens
          tokens = ::Gmail::OauthService.exchange_code(params[:code])

          # Get user email from Gmail
          email = ::Gmail::OauthService.get_user_email(tokens[:access_token])

          # Create or update connection
          connection = current_user.gmail_connections.find_or_initialize_by(email: email)
          connection.update!(
            access_token: tokens[:access_token],
            refresh_token: tokens[:refresh_token],
            token_expires_at: tokens[:expires_at],
            status: 'active',
            sync_enabled: true,
            error_message: nil
          )

          # Trigger initial sync
          GmailSyncJob.perform_later(connection.id)

          present connection, with: V1::Entities::GmailConnection
        rescue ::Gmail::OauthService::TokenError => e
          error!({ error: "OAuth failed: #{e.message}" }, 422)
        rescue ::Gmail::OauthService::ConfigurationError => e
          error!({ error: e.message }, 503)
        end
      end

      # ============================================
      # Gmail Connections Management
      # ============================================

      desc 'List all Gmail connections'
      get :connections do
        require_authentication!

        connections = current_user.gmail_connections.order(created_at: :desc)
        present connections, with: V1::Entities::GmailConnection
      end

      desc 'Get a specific Gmail connection'
      params do
        requires :id, type: Integer, desc: 'Connection ID'
      end
      get 'connections/:id' do
        require_authentication!

        connection = current_user.gmail_connections.find(params[:id])
        present connection, with: V1::Entities::GmailConnection
      end

      desc 'Update Gmail connection settings'
      params do
        requires :id, type: Integer, desc: 'Connection ID'
        optional :sync_enabled, type: Boolean, desc: 'Enable/disable sync'
      end
      patch 'connections/:id' do
        require_authentication!

        connection = current_user.gmail_connections.find(params[:id])
        connection.update!(declared(params, include_missing: false).except(:id))

        present connection, with: V1::Entities::GmailConnection
      end

      desc 'Trigger manual sync for a Gmail connection'
      params do
        requires :id, type: Integer, desc: 'Connection ID'
      end
      post 'connections/:id/sync' do
        require_authentication!

        connection = current_user.gmail_connections.find(params[:id])

        unless connection.connected?
          error!({ error: 'Connection is not active. Please reconnect Gmail.' }, 422)
        end

        if connection.status == 'syncing'
          error!({ error: 'Sync already in progress' }, 422)
        end

        # Queue sync job
        GmailSyncJob.perform_later(connection.id)

        {
          success: true,
          message: 'Sync started',
          connection: V1::Entities::GmailConnection.represent(connection)
        }
      end

      desc 'Disconnect Gmail account'
      params do
        requires :id, type: Integer, desc: 'Connection ID'
      end
      delete 'connections/:id' do
        require_authentication!

        connection = current_user.gmail_connections.find(params[:id])

        # Try to revoke access token
        if connection.access_token.present?
          ::Gmail::OauthService.revoke_token(connection.access_token)
        end

        connection.destroy!

        { success: true, message: 'Gmail account disconnected' }
      end

      # ============================================
      # Gmail Integration Status
      # ============================================

      desc 'Check if Gmail integration is available'
      get :status do
        {
          configured: ::Gmail::OauthService.configured?,
          enabled: ::Gmail::OauthService.configured?
        }
      end
    end
  end
end
