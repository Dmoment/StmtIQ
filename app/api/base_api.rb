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

  rescue_from Pundit::NotAuthorizedError do |_e|
    error!({ error: 'Not authorized' }, 403)
  end

  rescue_from :all do |e|
    Rails.logger.error("API Error: #{e.message}\n#{e.backtrace.first(10).join("\n")}")

    if Rails.env.development? || Rails.env.test?
      error!({ error: e.class.name, detail: e.message, backtrace: e.backtrace.first(5) }, 500)
    else
      error!({ error: 'Internal server error' }, 500)
    end
  end

  helpers ::Helpers::WorkspaceHelpers

  helpers do
    # ============================================
    # Authentication (Clerk JWT)
    # ============================================

    def current_user
      @current_user ||= authenticate_with_clerk
    end

    def authenticated?
      current_user.present?
    end

    def authenticate!
      error!({ error: 'Unauthorized' }, 401) unless authenticated?
    end

    # Alias for backwards compatibility
    alias_method :require_authentication!, :authenticate!

    # ============================================
    # Authorization (Pundit)
    # ============================================

    def policy_scope(scope)
      Pundit.policy_scope!(current_user, scope)
    end

    def authorize(record, query = nil)
      Pundit.authorize(current_user, record, query)
    end

    # ============================================
    # Pagination (Kaminari)
    # ============================================

    def paginate_collection(collection, &block)
      page = (params[:page] || 1).to_i
      per_page = [(params[:per_page] || 25).to_i, 100].min

      paginated = collection.page(page).per(per_page)

      # Set pagination headers
      header 'X-Total-Count', paginated.total_count.to_s
      header 'X-Total-Pages', paginated.total_pages.to_s
      header 'X-Current-Page', paginated.current_page.to_s
      header 'X-Per-Page', paginated.limit_value.to_s

      if block_given?
        paginated.map { |item| block.call(item) }
      else
        paginated
      end
    end

    # ============================================
    # Ransack Filtering
    # ============================================

    def ransack_filter(scope)
      if params[:q].present?
        scope.ransack(params[:q]).result(distinct: true)
      else
        scope
      end
    end

    private

    def authenticate_with_clerk
      token = extract_bearer_token

      # Development fallback when no token provided
      if token.blank?
        return dev_user_fallback if Rails.env.development? && ENV['BYPASS_AUTH'] == 'true'
        return nil
      end

      # Verify Clerk JWT
      payload = Clerk::JwtVerifier.verify(token)
      return nil unless payload

      # Find or create user from Clerk data
      Clerk::UserSync.new(payload).find_or_create_user
    end

    def extract_bearer_token
      auth_header = headers['Authorization'] || headers['authorization']
      return nil unless auth_header&.start_with?('Bearer ')

      auth_header.split(' ').last
    end

    def dev_user_fallback
      User.find_or_create_by!(clerk_id: 'dev_clerk_user') do |user|
        user.name = 'Dev User'
        user.phone_number = '9999999999'
        user.phone_verified = true
        user.auth_provider = 'development'
      end
    end
  end

  mount V1::Root
end
