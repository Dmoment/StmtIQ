# frozen_string_literal: true

module V1
  class Clients < Grape::API
    resource :clients do
      before { authenticate! }

      desc 'List clients with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25, values: 1..100
        optional :search, type: String
        optional :active_only, type: Boolean, default: true
      end
      get do
        require_workspace!

        clients = policy_scope(Client).includes(:sales_invoices)

        clients = clients.active if params[:active_only]
        clients = clients.search(params[:search]) if params[:search].present?

        clients = clients.alphabetical
        paginated = clients.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s
        header 'X-Current-Page', paginated.current_page.to_s
        header 'X-Per-Page', paginated.limit_value.to_s

        present paginated, with: V1::Entities::Client
      end

      desc 'Create a new client'
      params do
        requires :name, type: String

        optional :email, type: String
        optional :phone, type: String
        optional :company_name, type: String
        optional :gstin, type: String
        optional :pan, type: String

        optional :billing_address_line1, type: String
        optional :billing_address_line2, type: String
        optional :billing_city, type: String
        optional :billing_state, type: String
        optional :billing_state_code, type: String
        optional :billing_pincode, type: String
        optional :billing_country, type: String

        optional :shipping_address_line1, type: String
        optional :shipping_address_line2, type: String
        optional :shipping_city, type: String
        optional :shipping_state, type: String
        optional :shipping_state_code, type: String
        optional :shipping_pincode, type: String
        optional :shipping_country, type: String

        optional :default_currency, type: String, values: %w[INR USD EUR GBP], default: 'INR'
        optional :notes, type: String
      end
      post do
        require_workspace!
        authorize Client, :create?

        client = current_user.clients.create!(
          declared(params, include_missing: false).merge(
            workspace: current_workspace
          )
        )

        present client, with: V1::Entities::Client
      end

      desc 'Get client details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_workspace!

        client = policy_scope(Client).find(params[:id])
        authorize client, :show?

        present client, with: V1::Entities::Client, full: true
      end

      desc 'Update a client'
      params do
        requires :id, type: Integer

        optional :name, type: String
        optional :email, type: String
        optional :phone, type: String
        optional :company_name, type: String
        optional :gstin, type: String
        optional :pan, type: String

        optional :billing_address_line1, type: String
        optional :billing_address_line2, type: String
        optional :billing_city, type: String
        optional :billing_state, type: String
        optional :billing_state_code, type: String
        optional :billing_pincode, type: String
        optional :billing_country, type: String

        optional :shipping_address_line1, type: String
        optional :shipping_address_line2, type: String
        optional :shipping_city, type: String
        optional :shipping_state, type: String
        optional :shipping_state_code, type: String
        optional :shipping_pincode, type: String
        optional :shipping_country, type: String

        optional :default_currency, type: String, values: %w[INR USD EUR GBP]
        optional :notes, type: String
        optional :is_active, type: Boolean
      end
      patch ':id' do
        require_workspace!

        client = policy_scope(Client).find(params[:id])
        authorize client, :update?

        client.update!(declared(params, include_missing: false).except(:id))

        present client, with: V1::Entities::Client
      end

      desc 'Delete a client'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_workspace!

        client = policy_scope(Client).find(params[:id])
        authorize client, :destroy?

        # Soft delete by deactivating
        if client.sales_invoices.any?
          client.update!(is_active: false)
          { success: true, message: 'Client deactivated (has invoices)' }
        else
          client.destroy!
          { success: true, message: 'Client deleted' }
        end
      end

      desc 'Get client invoice history'
      params do
        requires :id, type: Integer
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25
      end
      get ':id/invoices' do
        require_workspace!

        client = policy_scope(Client).find(params[:id])
        authorize client, :show?

        invoices = client.sales_invoices.recent
        paginated = invoices.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s

        present paginated, with: V1::Entities::SalesInvoice
      end

      desc 'Upload client logo'
      params do
        requires :id, type: Integer
        requires :file, type: File
      end
      post ':id/logo' do
        require_workspace!

        client = policy_scope(Client).find(params[:id])
        authorize client, :update?

        uploaded_file = params[:file]
        content_type = uploaded_file[:type]

        unless %w[image/png image/jpeg image/jpg image/gif image/webp image/svg+xml].include?(content_type)
          error!({ error: 'Invalid file type. Only PNG, JPEG, GIF, WebP, and SVG are allowed.' }, 422)
        end

        client.logo.attach(
          io: uploaded_file[:tempfile],
          filename: uploaded_file[:filename],
          content_type: content_type
        )

        # Reload to ensure the attachment is reflected
        client.reload
        present client, with: V1::Entities::Client
      end

      desc 'Delete client logo'
      params do
        requires :id, type: Integer
      end
      delete ':id/logo' do
        require_workspace!

        client = policy_scope(Client).find(params[:id])
        authorize client, :update?

        client.logo.purge if client.logo.attached?

        present client, with: V1::Entities::Client
      end
    end
  end
end
