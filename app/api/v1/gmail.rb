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

        # Generate state token with embedded user_id for CSRF protection
        # Format: base64(user_id:random_token:signature)
        random_token = SecureRandom.urlsafe_base64(16)
        payload = "#{current_user.id}:#{random_token}"
        signature = OpenSSL::HMAC.hexdigest('SHA256', Rails.application.secret_key_base, payload)
        state = Base64.urlsafe_encode64("#{payload}:#{signature}")

        # Also cache for extra validation
        Rails.cache.write("gmail_oauth_state:#{current_user.id}", random_token, expires_in: 10.minutes)

        {
          authorization_url: ::Gmail::OauthService.authorization_url(state: state),
          state: state
        }
      end

      desc 'Handle Gmail OAuth callback (browser redirect from Google)'
      params do
        requires :code, type: String, desc: 'Authorization code from Google'
        requires :state, type: String, desc: 'CSRF state token'
      end
      get :callback do
        # This is a browser redirect from Google - no JWT auth available
        # Extract user_id from the signed state token instead

        begin
          decoded_state = Base64.urlsafe_decode64(params[:state])
          user_id_str, random_token, signature = decoded_state.split(':')
          user_id = user_id_str.to_i

          # Verify signature
          payload = "#{user_id}:#{random_token}"
          expected_signature = OpenSSL::HMAC.hexdigest('SHA256', Rails.application.secret_key_base, payload)

          unless ActiveSupport::SecurityUtils.secure_compare(signature, expected_signature)
            redirect "/app/settings?gmail_error=#{CGI.escape('Invalid state token')}"
            return
          end

          # Verify cached state
          cached_token = Rails.cache.read("gmail_oauth_state:#{user_id}")
          unless cached_token && ActiveSupport::SecurityUtils.secure_compare(cached_token, random_token)
            redirect "/app/settings?gmail_error=#{CGI.escape('State token expired. Please try again.')}"
            return
          end

          # Clear state token
          Rails.cache.delete("gmail_oauth_state:#{user_id}")

          # Find user
          user = User.find(user_id)

          # Exchange code for tokens
          tokens = ::Gmail::OauthService.exchange_code(params[:code])

          # Get user email from Gmail
          email = ::Gmail::OauthService.get_user_email(tokens[:access_token])

          # Create or update connection
          connection = user.gmail_connections.find_or_initialize_by(email: email)
          connection.update!(
            access_token: tokens[:access_token],
            refresh_token: tokens[:refresh_token],
            token_expires_at: tokens[:expires_at],
            status: 'active',
            sync_enabled: true,
            error_message: nil
          )

          # Note: We don't auto-sync anymore - user triggers sync manually with filters

          # Redirect to frontend with success
          redirect "/app/settings?gmail_success=true&gmail_email=#{CGI.escape(email)}"

        rescue ArgumentError => e
          # Base64 decode error
          redirect "/app/settings?gmail_error=#{CGI.escape('Invalid callback state')}"
        rescue ActiveRecord::RecordNotFound
          redirect "/app/settings?gmail_error=#{CGI.escape('User not found')}"
        rescue ::Gmail::OauthService::TokenError => e
          redirect "/app/settings?gmail_error=#{CGI.escape(e.message)}"
        rescue ::Gmail::OauthService::ConfigurationError => e
          redirect "/app/settings?gmail_error=#{CGI.escape(e.message)}"
        rescue => e
          Rails.logger.error("Gmail OAuth callback error: #{e.message}")
          redirect "/app/settings?gmail_error=#{CGI.escape('Connection failed. Please try again.')}"
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

      desc 'Get sync suggestions based on user transactions'
      get 'sync_suggestions' do
        require_authentication!

        # Get transaction date range for current workspace
        transactions = current_workspace.transactions

        if transactions.exists?
          date_range = transactions.pluck(Arel.sql('MIN(transaction_date), MAX(transaction_date)')).first
          min_date = date_range[0]
          max_date = date_range[1]

          # Extract unique vendor/counterparty keywords from transactions
          # Get unique counterparty names and significant words from descriptions
          counterparties = transactions
            .where.not(counterparty_name: [nil, ''])
            .distinct
            .pluck(:counterparty_name)
            .compact
            .map(&:strip)
            .reject(&:blank?)
            .uniq
            .first(20)

          # Common invoice-related keywords
          default_keywords = %w[invoice receipt bill payment order confirmation]

          {
            has_transactions: true,
            date_range: {
              start_date: min_date&.to_s,
              end_date: max_date&.to_s,
            },
            suggested_keywords: counterparties,
            default_keywords: default_keywords,
            transaction_count: transactions.count,
          }
        else
          {
            has_transactions: false,
            date_range: nil,
            suggested_keywords: [],
            default_keywords: %w[invoice receipt bill payment],
            transaction_count: 0,
          }
        end
      end

      desc 'Trigger manual sync for a Gmail connection with filters'
      params do
        requires :id, type: Integer, desc: 'Connection ID'
        optional :date_from, type: Date, desc: 'Start date for email search'
        optional :date_to, type: Date, desc: 'End date for email search'
        optional :keywords, type: Array[String], desc: 'Keywords to search in emails'
        optional :include_attachments_only, type: Boolean, default: true, desc: 'Only emails with attachments'
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

        # Build sync options
        sync_options = {
          date_from: params[:date_from],
          date_to: params[:date_to],
          keywords: params[:keywords] || [],
          include_attachments_only: params[:include_attachments_only],
        }.compact

        # Queue sync job with options
        GmailSyncJob.perform_later(connection.id, sync_options)

        {
          success: true,
          message: 'Sync started with your filters',
          filters_applied: {
            date_range: params[:date_from] || params[:date_to] ? "#{params[:date_from]} to #{params[:date_to]}" : nil,
            keywords: params[:keywords],
            attachments_only: params[:include_attachments_only],
          },
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
