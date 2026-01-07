# frozen_string_literal: true

module V1
  class Invoices < Grape::API
    resource :invoices do
      desc 'List user invoices with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 20, values: 1..100 # Security: Limit max per_page
        optional :status, type: String, values: %w[pending processing extracted matched unmatched failed]
        optional :source, type: String, values: %w[upload gmail]
        optional :from_date, type: Date
        optional :to_date, type: Date
      end
      get do
        authenticate!

        # Performance: Preload associations to avoid N+1
        invoices = current_user.invoices
          .includes(:matched_transaction, :account)
          .recent

        invoices = invoices.where(status: params[:status]) if params[:status]
        invoices = invoices.where(source: params[:source]) if params[:source]
        invoices = invoices.where('invoice_date >= ?', params[:from_date]) if params[:from_date]
        invoices = invoices.where('invoice_date <= ?', params[:to_date]) if params[:to_date]

        invoices = invoices.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', invoices.total_count.to_s
        header 'X-Total-Pages', invoices.total_pages.to_s
        header 'X-Current-Page', invoices.current_page.to_s
        header 'X-Per-Page', invoices.limit_value.to_s

        present invoices, with: V1::Entities::Invoice
      end

      desc 'Upload a new invoice via presigned URL'
      params do
        requires :file_key, type: String, desc: 'S3 file key from presigned upload'
        optional :account_id, type: Integer
        optional :vendor_name, type: String
        optional :invoice_date, type: Date
        optional :total_amount, type: Float
        optional :currency, type: String, values: %w[INR USD EUR GBP], default: 'INR'
      end
      post do
        authenticate!

        invoice = current_user.invoices.create!(
          source: 'upload',
          account_id: params[:account_id],
          vendor_name: params[:vendor_name],
          invoice_date: params[:invoice_date],
          total_amount: params[:total_amount],
          currency: params[:currency],
          status: 'pending'
        )

        # Attach file from S3
        invoice.file.attach(key: params[:file_key])

        # Enqueue extraction
        InvoiceExtractionJob.perform_later(invoice.id)

        present invoice, with: V1::Entities::Invoice
      end

      desc 'Upload invoice directly (multipart form)'
      params do
        requires :file, type: File, desc: 'Invoice PDF or image file'
        optional :account_id, type: Integer
        optional :vendor_name, type: String
        optional :invoice_date, type: Date
        optional :total_amount, type: Float
        optional :currency, type: String, values: %w[INR USD EUR GBP], default: 'INR'
      end
      post :upload do
        authenticate!

        uploaded_file = params[:file]
        filename = uploaded_file[:filename]
        content_type = uploaded_file[:type]
        file_content = uploaded_file[:tempfile].read
        uploaded_file[:tempfile].rewind

        # Security: Validate file thoroughly
        begin
          Invoices::FileValidator.new(file_content, content_type, file_content.bytesize).validate!
        rescue Invoices::FileValidator::InvalidFileTypeError,
               Invoices::FileValidator::FileTooLargeError,
               Invoices::FileValidator::MaliciousContentError => e
          error!({ error: e.message }, 422)
        end

        invoice = current_user.invoices.create!(
          source: 'upload',
          account_id: params[:account_id],
          vendor_name: params[:vendor_name],
          invoice_date: params[:invoice_date],
          total_amount: params[:total_amount],
          currency: params[:currency],
          status: 'pending'
        )

        # Attach file
        invoice.file.attach(
          io: uploaded_file[:tempfile],
          filename: filename,
          content_type: content_type
        )

        # Enqueue extraction
        InvoiceExtractionJob.perform_later(invoice.id)

        present invoice, with: V1::Entities::Invoice
      end

      desc 'Get invoice details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        authenticate!

        invoice = current_user.invoices.find(params[:id])
        present invoice, with: V1::Entities::Invoice, full: true
      end

      desc 'Update invoice (manual correction)'
      params do
        requires :id, type: Integer
        optional :vendor_name, type: String
        optional :vendor_gstin, type: String
        optional :invoice_date, type: Date
        optional :total_amount, type: Float
        optional :invoice_number, type: String
        optional :currency, type: String, values: %w[INR USD EUR GBP]
      end
      patch ':id' do
        authenticate!

        invoice = current_user.invoices.find(params[:id])
        update_params = declared(params, include_missing: false).except(:id)

        invoice.update!(update_params)

        # Re-run matching if key fields changed
        if update_params[:total_amount] || update_params[:invoice_date] || update_params[:vendor_name]
          if invoice.can_match?
            InvoiceMatchingJob.perform_later(invoice.id)
          end
        end

        present invoice, with: V1::Entities::Invoice
      end

      desc 'Delete invoice'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        authenticate!

        invoice = current_user.invoices.find(params[:id])

        # Unlink from transaction first
        invoice.matched_transaction&.update!(invoice_id: nil)

        # Purge file from S3
        invoice.file.purge_later if invoice.file.attached?

        invoice.destroy!

        { success: true }
      end

      desc 'Get match suggestions for invoice'
      params do
        requires :id, type: Integer
      end
      get ':id/suggestions' do
        authenticate!

        invoice = current_user.invoices.find(params[:id])

        unless invoice.total_amount
          error!({ error: 'Invoice has no amount - cannot find suggestions' }, 422)
        end

        suggestions = ::Invoices::MatchingService.new(invoice).find_suggestions

        suggestions.map do |s|
          {
            transaction_id: s[:transaction].id,
            description: s[:transaction].description,
            amount: s[:transaction].amount,
            transaction_date: s[:transaction].transaction_date,
            category: s[:transaction].category&.name,
            score: s[:score],
            breakdown: s[:breakdown]
          }
        end
      end

      desc 'Manually link invoice to transaction'
      params do
        requires :id, type: Integer
        requires :transaction_id, type: Integer
      end
      post ':id/link' do
        authenticate!

        invoice = current_user.invoices.find(params[:id])
        transaction = current_user.transactions.find(params[:transaction_id])

        # Check transaction not already linked
        if transaction.invoice_id.present? && transaction.invoice_id != invoice.id
          error!({ error: 'Transaction already has an invoice attached' }, 422)
        end

        invoice.mark_matched!(transaction, confidence: 1.0, method: 'manual')

        present invoice, with: V1::Entities::Invoice
      end

      desc 'Unlink invoice from transaction'
      params do
        requires :id, type: Integer
      end
      post ':id/unlink' do
        authenticate!

        invoice = current_user.invoices.find(params[:id])

        unless invoice.matched?
          error!({ error: 'Invoice is not linked to any transaction' }, 422)
        end

        invoice.unlink_transaction!

        present invoice, with: V1::Entities::Invoice
      end

      desc 'Retry extraction for failed invoice'
      params do
        requires :id, type: Integer
      end
      post ':id/retry' do
        authenticate!

        invoice = current_user.invoices.find(params[:id])

        unless invoice.failed?
          error!({ error: 'Only failed invoices can be retried' }, 422)
        end

        unless invoice.file.attached?
          error!({ error: 'No file attached to invoice' }, 422)
        end

        invoice.update!(status: 'pending', extracted_data: {})
        InvoiceExtractionJob.perform_later(invoice.id)

        present invoice, with: V1::Entities::Invoice
      end

      desc 'Get invoice statistics'
      get :stats do
        authenticate!

        # Performance: Use single query with group by instead of multiple queries
        invoices = current_user.invoices

        status_counts = invoices.group(:status).count
        source_counts = invoices.group(:source).count

        matched_invoices = invoices.matched
        matched_stats = matched_invoices.pick('SUM(total_amount)', 'AVG(match_confidence)')

        {
          total: invoices.count,
          by_status: {
            pending: status_counts['pending'] || 0,
            processing: status_counts['processing'] || 0,
            extracted: status_counts['extracted'] || 0,
            matched: status_counts['matched'] || 0,
            unmatched: status_counts['unmatched'] || 0,
            failed: status_counts['failed'] || 0
          },
          by_source: {
            upload: source_counts['upload'] || 0,
            gmail: source_counts['gmail'] || 0
          },
          total_amount_matched: matched_stats&.first || 0,
          avg_match_confidence: matched_stats&.last&.round(2) || 0
        }
      end
    end

    helpers do
      def authenticate!
        require_authentication!
      end
    end
  end
end
