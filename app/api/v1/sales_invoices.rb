# frozen_string_literal: true

module V1
  class SalesInvoices < Grape::API
    resource :sales_invoices do
      before { authenticate! }

      desc 'List sales invoices with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25, values: 1..100
        optional :status, type: String, values: SalesInvoice::STATUSES
        optional :client_id, type: Integer
        optional :from_date, type: Date
        optional :to_date, type: Date
      end
      get do
        require_workspace!

        filters = declared(params, include_missing: false).slice(:status, :client_id, :from_date, :to_date)
        invoices = ::SalesInvoices::FilterService.new(policy_scope(SalesInvoice), filters).call

        paginated = invoices.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s
        header 'X-Current-Page', paginated.current_page.to_s
        header 'X-Per-Page', paginated.limit_value.to_s

        present paginated, with: V1::Entities::SalesInvoice
      end

      desc 'Get next invoice number'
      get :next_number do
        require_workspace!

        profile = current_workspace.business_profile
        error!({ error: 'Business profile required' }, 422) unless profile

        {
          next_number: "#{profile.invoice_prefix}#{profile.invoice_next_number.to_s.rjust(5, '0')}"
        }
      end

      desc 'Get invoice statistics'
      get :stats do
        require_workspace!

        stats = ::SalesInvoices::StatsService.new(policy_scope(SalesInvoice)).call
        stats
      end

      desc 'Create a new sales invoice'
      params do
        requires :client_id, type: Integer

        optional :invoice_date, type: Date
        optional :due_date, type: Date
        optional :currency, type: String, values: SalesInvoice::CURRENCIES, default: 'INR'
        optional :exchange_rate, type: Float
        optional :exchange_rate_date, type: Date

        optional :discount_amount, type: Float, default: 0
        optional :discount_type, type: String, values: SalesInvoice::DISCOUNT_TYPES, default: 'fixed'

        optional :tax_type, type: String, values: SalesInvoice::TAX_TYPES
        optional :cgst_rate, type: Float
        optional :sgst_rate, type: Float
        optional :igst_rate, type: Float
        optional :place_of_supply, type: String
        optional :is_reverse_charge, type: Boolean, default: false
        optional :cess_rate, type: Float, default: 0

        optional :notes, type: String
        optional :terms, type: String
        optional :primary_color, type: String
        optional :secondary_color, type: String

        # Custom fields for additional info like LUT Number, PO Number, etc.
        optional :custom_fields, type: Array do
          requires :label, type: String
          requires :value, type: String
        end

        optional :line_items, type: Array do
          requires :description, type: String
          optional :hsn_sac_code, type: String
          optional :quantity, type: Float, default: 1
          optional :unit, type: String, default: 'units'
          requires :rate, type: Float
          optional :gst_rate, type: Float, default: 18
        end
      end
      post do
        require_workspace!
        authorize SalesInvoice, :create?

        # Security: Use policy_scope to prevent IDOR on client lookup
        client = policy_scope(Client).find(params[:client_id])

        invoice_params = declared(params, include_missing: false)
        result = ::SalesInvoices::CreatorService.new(
          user: current_user,
          workspace: current_workspace,
          client: client,
          params: invoice_params
        ).call

        if result.success?
          present result.invoice, with: V1::Entities::SalesInvoice, full: true
        else
          error!({ errors: result.errors }, 422)
        end
      end

      desc 'Get invoice details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_workspace!

        # Eager load associations to prevent N+1 queries
        invoice = policy_scope(SalesInvoice)
                  .includes(:client, :business_profile, line_items: [])
                  .find(params[:id])
        authorize invoice, :show?

        present invoice, with: V1::Entities::SalesInvoice, full: true
      end

      desc 'Update an invoice'
      params do
        requires :id, type: Integer

        optional :client_id, type: Integer
        optional :invoice_date, type: Date
        optional :due_date, type: Date
        optional :currency, type: String, values: SalesInvoice::CURRENCIES
        optional :exchange_rate, type: Float
        optional :exchange_rate_date, type: Date

        optional :discount_amount, type: Float
        optional :discount_type, type: String, values: SalesInvoice::DISCOUNT_TYPES

        optional :tax_type, type: String, values: SalesInvoice::TAX_TYPES
        optional :cgst_rate, type: Float
        optional :sgst_rate, type: Float
        optional :igst_rate, type: Float
        optional :place_of_supply, type: String
        optional :is_reverse_charge, type: Boolean
        optional :cess_rate, type: Float

        optional :notes, type: String
        optional :terms, type: String
        optional :primary_color, type: String
        optional :secondary_color, type: String

        # Custom fields for additional info like LUT Number, PO Number, etc.
        optional :custom_fields, type: Array do
          requires :label, type: String
          requires :value, type: String
        end

        optional :line_items, type: Array do
          optional :id, type: Integer
          optional :_destroy, type: Boolean
          requires :description, type: String
          optional :hsn_sac_code, type: String
          optional :quantity, type: Float
          optional :unit, type: String
          requires :rate, type: Float
          optional :gst_rate, type: Float
        end
      end
      patch ':id' do
        require_workspace!

        invoice = policy_scope(SalesInvoice).find(params[:id])
        authorize invoice, :update?

        update_params = declared(params, include_missing: false).except(:id)
        result = ::SalesInvoices::UpdaterService.new(
          invoice: invoice,
          params: update_params,
          client_scope: policy_scope(Client)
        ).call

        if result.success?
          present result.invoice, with: V1::Entities::SalesInvoice, full: true
        else
          error!({ errors: result.errors }, 422)
        end
      end

      desc 'Delete a draft invoice'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_workspace!

        invoice = policy_scope(SalesInvoice).find(params[:id])
        authorize invoice, :destroy?

        invoice.pdf_file.purge_later if invoice.pdf_file.attached?
        invoice.destroy!

        { success: true }
      end

      desc 'Send invoice to client'
      params do
        requires :id, type: Integer
      end
      post ':id/send' do
        require_workspace!

        invoice = policy_scope(SalesInvoice)
                  .includes(:client, :business_profile)
                  .find(params[:id])
        authorize invoice, :send_invoice?

        # Generate PDF if not exists (Open/Closed: Delegated to PdfManager)
        ::SalesInvoices::PdfManager.new(invoice).ensure_pdf_exists

        # Send email
        ::SalesInvoices::EmailService.new(invoice).send_invoice

        invoice.mark_sent!

        present invoice, with: V1::Entities::SalesInvoice
      end

      desc 'Duplicate an invoice'
      params do
        requires :id, type: Integer
      end
      post ':id/duplicate' do
        require_workspace!

        invoice = policy_scope(SalesInvoice)
                  .includes(:line_items, :business_profile)
                  .find(params[:id])
        authorize invoice, :duplicate?

        new_invoice = invoice.duplicate
        new_invoice.invoice_number = new_invoice.business_profile.generate_invoice_number
        new_invoice.save!

        present new_invoice, with: V1::Entities::SalesInvoice, full: true
      end

      desc 'Download invoice PDF'
      params do
        requires :id, type: Integer
      end
      get ':id/pdf' do
        require_workspace!

        invoice = policy_scope(SalesInvoice)
                  .includes(:business_profile)
                  .find(params[:id])
        authorize invoice, :download?

        pdf_manager = ::SalesInvoices::PdfManager.new(invoice)

        content_type 'application/pdf'
        header 'Content-Disposition', "attachment; filename=\"#{pdf_manager.pdf_filename}\""
        env['api.format'] = :binary

        pdf_manager.download_pdf
      end

      desc 'Record a payment'
      params do
        requires :id, type: Integer
        requires :amount, type: Float
        optional :payment_date, type: Date
        optional :payment_method, type: String
        optional :reference, type: String
      end
      post ':id/record_payment' do
        require_workspace!

        invoice = policy_scope(SalesInvoice).find(params[:id])
        authorize invoice, :record_payment?

        # Security: Validate payment amount to prevent overflow and negative values
        validator = ::SalesInvoices::InputValidator.new
        unless validator.validate_payment_amount(params[:amount], invoice.balance_due)
          error!({ errors: validator.errors }, 422)
        end

        invoice.record_payment!(params[:amount])

        present invoice, with: V1::Entities::SalesInvoice
      end

      desc 'Cancel an invoice'
      params do
        requires :id, type: Integer
      end
      post ':id/cancel' do
        require_workspace!

        invoice = policy_scope(SalesInvoice).find(params[:id])
        authorize invoice, :update?

        invoice.cancel!

        present invoice, with: V1::Entities::SalesInvoice
      end

      desc 'Calculate GST for invoice'
      params do
        requires :subtotal, type: Float
        requires :seller_state_code, type: String
        requires :buyer_state_code, type: String
        optional :tax_rate, type: Float, default: 18.0
      end
      post :calculate_gst do
        require_workspace!

        # Security: Validate state codes to prevent invalid input
        unless ::SalesInvoices::GstCalculator.valid_state_code?(params[:seller_state_code])
          error!({ error: 'Invalid seller state code' }, 422)
        end

        unless ::SalesInvoices::GstCalculator.valid_state_code?(params[:buyer_state_code])
          error!({ error: 'Invalid buyer state code' }, 422)
        end

        result = ::SalesInvoices::GstCalculator.new(
          subtotal: params[:subtotal],
          seller_state_code: params[:seller_state_code],
          buyer_state_code: params[:buyer_state_code],
          tax_rate: params[:tax_rate]
        ).calculate

        result
      end
    end
  end
end
