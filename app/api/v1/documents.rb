# frozen_string_literal: true

module V1
  class Documents < Grape::API
    resource :documents do
      before { authenticate! }

      desc 'List documents with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25, values: 1..100
        optional :folder_id, type: Integer
        optional :document_type, type: String, values: Document::DOCUMENT_TYPES
        optional :financial_year, type: String
        optional :tag, type: String
        optional :search, type: String
        optional :start_date, type: Date
        optional :end_date, type: Date
      end
      get do
        require_workspace!

        documents = policy_scope(Document).recent

        documents = documents.in_folder(params[:folder_id]) if params[:folder_id].present?
        documents = documents.root_level if params[:folder_id].nil? && params.key?(:folder_id)
        documents = documents.by_type(params[:document_type]) if params[:document_type].present?
        documents = documents.by_financial_year(params[:financial_year]) if params[:financial_year].present?
        documents = documents.tagged_with(params[:tag]) if params[:tag].present?
        documents = documents.by_date_range(params[:start_date], params[:end_date]) if params[:start_date] && params[:end_date]

        if params[:search].present?
          documents = documents.where('name ILIKE ?', "%#{params[:search]}%")
        end

        paginated = documents.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s
        header 'X-Current-Page', paginated.current_page.to_s
        header 'X-Per-Page', paginated.limit_value.to_s

        present paginated, with: V1::Entities::Document
      end

      desc 'Upload a new document'
      params do
        requires :file, type: File
        optional :name, type: String
        optional :folder_id, type: Integer
        optional :document_type, type: String, values: Document::DOCUMENT_TYPES, default: 'other'
        optional :description, type: String
        optional :document_date, type: Date
        optional :tags, type: Array[String]
        optional :amount, type: BigDecimal
        optional :currency, type: String, values: %w[INR USD EUR GBP], default: 'INR'
        optional :reference_number, type: String
        optional :source, type: String
        optional :metadata, type: JSON
      end
      post do
        require_workspace!
        authorize Document, :create?

        document = current_workspace.documents.new(
          declared(params, include_missing: false).except(:file)
        )

        # Handle file attachment from Grape multipart upload
        file_param = params[:file]
        if file_param.is_a?(Hash) && file_param[:tempfile]
          # Grape/Rack multipart format
          document.file.attach(
            io: file_param[:tempfile],
            filename: file_param[:filename] || 'document',
            content_type: file_param[:type]
          )
        elsif file_param.respond_to?(:tempfile)
          # ActionDispatch::Http::UploadedFile format
          document.file.attach(
            io: file_param.tempfile,
            filename: file_param.original_filename,
            content_type: file_param.content_type
          )
        else
          error!({ error: 'Invalid file format' }, 422)
        end

        document.save!

        present document, with: V1::Entities::Document
      end

      desc 'Get document details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_workspace!

        document = policy_scope(Document).find(params[:id])
        authorize document, :show?

        present document, with: V1::Entities::Document, include_folder: true
      end

      desc 'Update document metadata'
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :folder_id, type: Integer
        optional :document_type, type: String, values: Document::DOCUMENT_TYPES
        optional :description, type: String
        optional :document_date, type: Date
        optional :tags, type: Array[String]
        optional :amount, type: BigDecimal
        optional :currency, type: String
        optional :reference_number, type: String
        optional :source, type: String
        optional :metadata, type: JSON
      end
      patch ':id' do
        require_workspace!

        document = policy_scope(Document).find(params[:id])
        authorize document, :update?

        document.update!(declared(params, include_missing: false).except(:id))

        present document, with: V1::Entities::Document
      end

      desc 'Delete a document'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_workspace!

        document = policy_scope(Document).find(params[:id])
        authorize document, :destroy?

        document.destroy!

        { success: true, message: 'Document deleted' }
      end

      desc 'Move document to folder'
      params do
        requires :id, type: Integer
        optional :folder_id, type: Integer, desc: 'Target folder ID (null for root)'
      end
      post ':id/move' do
        require_workspace!

        document = policy_scope(Document).find(params[:id])
        authorize document, :update?

        document.update!(folder_id: params[:folder_id])

        present document, with: V1::Entities::Document
      end

      desc 'Share document'
      params do
        requires :id, type: Integer
        requires :email, type: String
        optional :name, type: String
        optional :permission, type: String, values: %w[view download], default: 'view'
        optional :message, type: String
        optional :expires_in_days, type: Integer
      end
      post ':id/share' do
        require_workspace!

        document = policy_scope(Document).find(params[:id])
        authorize document, :share?

        expires_at = params[:expires_in_days].present? ? params[:expires_in_days].days.from_now : nil

        share = document.document_shares.create!(
          shared_by: current_user,
          shared_with_email: params[:email],
          shared_with_name: params[:name],
          permission: params[:permission],
          message: params[:message],
          expires_at: expires_at
        )

        {
          success: true,
          share_url: share.share_url,
          access_token: share.access_token,
          expires_at: share.expires_at
        }
      end

      desc 'List document types'
      get 'types/list' do
        Document::DOCUMENT_TYPES.map do |type|
          { value: type, label: type.titleize }
        end
      end
    end
  end
end
