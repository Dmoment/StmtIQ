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

        invoices = policy_scope(SalesInvoice)
                   .includes(:client, :line_items)
                   .recent

        invoices = invoices.where(status: params[:status]) if params[:status]
        invoices = invoices.where(client_id: params[:client_id]) if params[:client_id]
        invoices = invoices.where('invoice_date >= ?', params[:from_date]) if params[:from_date]
        invoices = invoices.where('invoice_date <= ?', params[:to_date]) if params[:to_date]

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

        invoices = policy_scope(SalesInvoice)

        status_counts = invoices.group(:status).count
        total_by_status = invoices.group(:status).sum(:total_amount)

        {
          total: invoices.count,
          total_amount: invoices.sum(:total_amount),
          total_paid: invoices.paid.sum(:total_amount),
          total_outstanding: invoices.outstanding.sum(:balance_due),
          by_status: SalesInvoice::STATUSES.each_with_object({}) do |status, hash|
            hash[status] = {
              count: status_counts[status] || 0,
              amount: total_by_status[status] || 0
            }
          end
        }
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

        optional :notes, type: String
        optional :terms, type: String
        optional :primary_color, type: String
        optional :secondary_color, type: String

        optional :line_items, type: Array do
          requires :description, type: String
          optional :hsn_sac_code, type: String
          optional :quantity, type: Float, default: 1
          optional :unit, type: String, default: 'units'
          requires :rate, type: Float
        end
      end
      post do
        require_workspace!
        authorize SalesInvoice, :create?

        profile = current_workspace.business_profile
        error!({ error: 'Business profile required to create invoices' }, 422) unless profile

        client = policy_scope(Client).find(params[:client_id])

        invoice_params = declared(params, include_missing: false).except(:line_items)
        invoice = current_user.sales_invoices.build(
          invoice_params.merge(
            workspace: current_workspace,
            client: client,
            business_profile: profile,
            status: 'draft'
          )
        )

        # Add line items
        (params[:line_items] || []).each_with_index do |item, index|
          invoice.line_items.build(
            description: item[:description],
            hsn_sac_code: item[:hsn_sac_code],
            quantity: item[:quantity] || 1,
            unit: item[:unit] || 'units',
            rate: item[:rate],
            position: index
          )
        end

        invoice.save!

        present invoice, with: V1::Entities::SalesInvoice, full: true
      end

      desc 'Get invoice details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_workspace!

        invoice = policy_scope(SalesInvoice)
                  .includes(:client, :business_profile, :line_items)
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

        optional :notes, type: String
        optional :terms, type: String
        optional :primary_color, type: String
        optional :secondary_color, type: String

        optional :line_items, type: Array do
          optional :id, type: Integer
          optional :_destroy, type: Boolean
          requires :description, type: String
          optional :hsn_sac_code, type: String
          optional :quantity, type: Float
          optional :unit, type: String
          requires :rate, type: Float
        end
      end
      patch ':id' do
        require_workspace!

        invoice = policy_scope(SalesInvoice).find(params[:id])
        authorize invoice, :update?

        update_params = declared(params, include_missing: false).except(:id, :line_items)

        # Handle client change
        if params[:client_id]
          client = policy_scope(Client).find(params[:client_id])
          update_params[:client] = client
        end

        invoice.assign_attributes(update_params)

        # Handle line items
        if params[:line_items]
          # Remove existing line items not in the update
          existing_ids = params[:line_items].map { |i| i[:id] }.compact
          invoice.line_items.where.not(id: existing_ids).destroy_all

          params[:line_items].each_with_index do |item, index|
            if item[:id] && (line_item = invoice.line_items.find_by(id: item[:id]))
              if item[:_destroy]
                line_item.destroy
              else
                line_item.update!(
                  description: item[:description],
                  hsn_sac_code: item[:hsn_sac_code],
                  quantity: item[:quantity],
                  unit: item[:unit],
                  rate: item[:rate],
                  position: index
                )
              end
            else
              invoice.line_items.build(
                description: item[:description],
                hsn_sac_code: item[:hsn_sac_code],
                quantity: item[:quantity] || 1,
                unit: item[:unit] || 'units',
                rate: item[:rate],
                position: index
              )
            end
          end
        end

        invoice.save!

        present invoice, with: V1::Entities::SalesInvoice, full: true
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

        invoice = policy_scope(SalesInvoice).find(params[:id])
        authorize invoice, :send_invoice?

        # Generate PDF if not exists
        unless invoice.pdf_file.attached?
          SalesInvoices::PdfGeneratorJob.perform_now(invoice.id)
          invoice.reload
        end

        # Send email
        SalesInvoices::EmailService.new(invoice).send_invoice

        invoice.mark_sent!

        present invoice, with: V1::Entities::SalesInvoice
      end

      desc 'Duplicate an invoice'
      params do
        requires :id, type: Integer
      end
      post ':id/duplicate' do
        require_workspace!

        invoice = policy_scope(SalesInvoice).find(params[:id])
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

        invoice = policy_scope(SalesInvoice).find(params[:id])
        authorize invoice, :download?

        # Generate PDF if not exists
        unless invoice.pdf_file.attached?
          SalesInvoices::PdfGeneratorJob.perform_now(invoice.id)
          invoice.reload
        end

        content_type 'application/pdf'
        header 'Content-Disposition', "attachment; filename=\"#{invoice.invoice_number}.pdf\""
        env['api.format'] = :binary

        invoice.pdf_file.download
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

        if params[:amount] > invoice.balance_due
          error!({ error: 'Payment amount exceeds balance due' }, 422)
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

        result = SalesInvoices::GstCalculator.new(
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
