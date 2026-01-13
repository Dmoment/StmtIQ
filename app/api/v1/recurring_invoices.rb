# frozen_string_literal: true

module V1
  class RecurringInvoices < Grape::API
    resource :recurring_invoices do
      before { authenticate! }

      desc 'List recurring invoices'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25, values: 1..100
        optional :status, type: String, values: RecurringInvoice::STATUSES
        optional :client_id, type: Integer
      end
      get do
        require_workspace!

        recurring = policy_scope(RecurringInvoice)
                    .includes(:client)
                    .recent

        recurring = recurring.where(status: params[:status]) if params[:status]
        recurring = recurring.where(client_id: params[:client_id]) if params[:client_id]

        paginated = recurring.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s

        present paginated, with: V1::Entities::RecurringInvoice
      end

      desc 'Create a recurring invoice'
      params do
        requires :name, type: String
        requires :client_id, type: Integer
        requires :frequency, type: String, values: RecurringInvoice::FREQUENCIES
        requires :start_date, type: Date

        optional :end_date, type: Date
        optional :auto_send, type: Boolean, default: false
        optional :send_days_before_due, type: Integer, default: 0
        optional :currency, type: String, values: SalesInvoice::CURRENCIES, default: 'INR'
        optional :payment_terms_days, type: Integer, default: 30
        optional :tax_rate, type: Float

        requires :template_data, type: Hash do
          optional :notes, type: String
          optional :terms, type: String
          requires :line_items, type: Array do
            requires :description, type: String
            optional :hsn_sac_code, type: String
            optional :quantity, type: Float, default: 1
            optional :unit, type: String, default: 'units'
            requires :rate, type: Float
          end
        end
      end
      post do
        require_workspace!
        authorize RecurringInvoice, :create?

        profile = current_workspace.business_profile
        error!({ error: 'Business profile required' }, 422) unless profile

        client = policy_scope(Client).find(params[:client_id])

        recurring = current_user.recurring_invoices.create!(
          declared(params, include_missing: false).merge(
            workspace: current_workspace,
            client: client,
            business_profile: profile
          )
        )

        present recurring, with: V1::Entities::RecurringInvoice, full: true
      end

      desc 'Get recurring invoice details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_workspace!

        recurring = policy_scope(RecurringInvoice)
                    .includes(:client, :last_invoice)
                    .find(params[:id])
        authorize recurring, :show?

        present recurring, with: V1::Entities::RecurringInvoice, full: true
      end

      desc 'Update a recurring invoice'
      params do
        requires :id, type: Integer

        optional :name, type: String
        optional :client_id, type: Integer
        optional :frequency, type: String, values: RecurringInvoice::FREQUENCIES
        optional :start_date, type: Date
        optional :end_date, type: Date
        optional :auto_send, type: Boolean
        optional :send_days_before_due, type: Integer
        optional :currency, type: String, values: SalesInvoice::CURRENCIES
        optional :payment_terms_days, type: Integer
        optional :tax_rate, type: Float

        optional :template_data, type: Hash do
          optional :notes, type: String
          optional :terms, type: String
          optional :line_items, type: Array do
            requires :description, type: String
            optional :hsn_sac_code, type: String
            optional :quantity, type: Float
            optional :unit, type: String
            requires :rate, type: Float
          end
        end
      end
      patch ':id' do
        require_workspace!

        recurring = policy_scope(RecurringInvoice).find(params[:id])
        authorize recurring, :update?

        update_params = declared(params, include_missing: false).except(:id)

        if params[:client_id]
          client = policy_scope(Client).find(params[:client_id])
          update_params[:client] = client
        end

        recurring.update!(update_params)

        present recurring, with: V1::Entities::RecurringInvoice, full: true
      end

      desc 'Delete a recurring invoice'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_workspace!

        recurring = policy_scope(RecurringInvoice).find(params[:id])
        authorize recurring, :destroy?

        recurring.destroy!

        { success: true }
      end

      desc 'Pause a recurring invoice'
      params do
        requires :id, type: Integer
      end
      post ':id/pause' do
        require_workspace!

        recurring = policy_scope(RecurringInvoice).find(params[:id])
        authorize recurring, :pause?

        recurring.pause!

        present recurring, with: V1::Entities::RecurringInvoice
      end

      desc 'Resume a recurring invoice'
      params do
        requires :id, type: Integer
      end
      post ':id/resume' do
        require_workspace!

        recurring = policy_scope(RecurringInvoice).find(params[:id])
        authorize recurring, :resume?

        recurring.resume!

        present recurring, with: V1::Entities::RecurringInvoice
      end

      desc 'Generate invoice now (manual trigger)'
      params do
        requires :id, type: Integer
      end
      post ':id/generate' do
        require_workspace!

        recurring = policy_scope(RecurringInvoice).find(params[:id])
        authorize recurring, :update?

        invoice = recurring.generate_invoice!
        error!({ error: 'Could not generate invoice' }, 422) unless invoice

        present invoice, with: V1::Entities::SalesInvoice, full: true
      end

      desc 'Get generated invoices for this recurring schedule'
      params do
        requires :id, type: Integer
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25
      end
      get ':id/invoices' do
        require_workspace!

        recurring = policy_scope(RecurringInvoice).find(params[:id])
        authorize recurring, :show?

        invoices = recurring.sales_invoices.recent
        paginated = invoices.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s

        present paginated, with: V1::Entities::SalesInvoice
      end
    end
  end
end
