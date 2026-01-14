# frozen_string_literal: true

module V1
  class Buckets < Grape::API
    resource :buckets do
      before { authenticate! }

      desc 'List buckets with filtering'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25, values: 1..100
        optional :financial_year, type: String
        optional :status, type: String, values: Bucket::STATUSES
        optional :bucket_type, type: String, values: Bucket::BUCKET_TYPES
      end
      get do
        require_workspace!

        buckets = policy_scope(Bucket).recent

        buckets = buckets.for_financial_year(params[:financial_year]) if params[:financial_year].present?
        buckets = buckets.where(status: params[:status]) if params[:status].present?
        buckets = buckets.where(bucket_type: params[:bucket_type]) if params[:bucket_type].present?

        paginated = buckets.page(params[:page]).per(params[:per_page])

        header 'X-Total-Count', paginated.total_count.to_s
        header 'X-Total-Pages', paginated.total_pages.to_s

        present paginated, with: V1::Entities::Bucket
      end

      desc 'Create a new bucket'
      params do
        optional :name, type: String
        optional :description, type: String
        optional :bucket_type, type: String, values: Bucket::BUCKET_TYPES, default: 'monthly'
        optional :month, type: Integer, values: 1..12
        optional :year, type: Integer
      end
      post do
        require_workspace!
        authorize Bucket, :create?

        bucket = current_workspace.buckets.create!(
          declared(params, include_missing: false).merge(
            created_by: current_user
          )
        )

        present bucket, with: V1::Entities::Bucket
      end

      desc 'Get or create monthly bucket'
      params do
        requires :month, type: Integer, values: 1..12
        requires :year, type: Integer
      end
      post 'monthly' do
        require_workspace!
        authorize Bucket, :create?

        bucket = current_workspace.buckets.monthly.for_month(params[:month], params[:year]).first
        bucket ||= current_workspace.buckets.create!(
          bucket_type: 'monthly',
          month: params[:month],
          year: params[:year],
          created_by: current_user
        )

        present bucket, with: V1::Entities::Bucket, include_documents: true
      end

      desc 'Get bucket details'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_workspace!

        bucket = policy_scope(Bucket).find(params[:id])
        authorize bucket, :show?

        present bucket, with: V1::Entities::Bucket, include_documents: true
      end

      desc 'Update a bucket'
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :description, type: String
      end
      patch ':id' do
        require_workspace!

        bucket = policy_scope(Bucket).find(params[:id])
        authorize bucket, :update?

        bucket.update!(declared(params, include_missing: false).except(:id))

        present bucket, with: V1::Entities::Bucket
      end

      desc 'Delete a bucket'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_workspace!

        bucket = policy_scope(Bucket).find(params[:id])
        authorize bucket, :destroy?

        bucket.destroy!

        { success: true, message: 'Bucket deleted' }
      end

      desc 'Add document to bucket'
      params do
        requires :id, type: Integer
        requires :document_id, type: Integer
        optional :notes, type: String
      end
      post ':id/documents' do
        require_workspace!

        bucket = policy_scope(Bucket).find(params[:id])
        authorize bucket, :update?

        document = policy_scope(Document).find(params[:document_id])

        bucket_item = bucket.add_document(document, notes: params[:notes])

        present bucket, with: V1::Entities::Bucket, include_documents: true
      end

      desc 'Remove document from bucket'
      params do
        requires :id, type: Integer
        requires :document_id, type: Integer
      end
      delete ':id/documents/:document_id' do
        require_workspace!

        bucket = policy_scope(Bucket).find(params[:id])
        authorize bucket, :update?

        document = policy_scope(Document).find(params[:document_id])
        bucket.remove_document(document)

        present bucket, with: V1::Entities::Bucket, include_documents: true
      end

      desc 'Finalize bucket'
      params do
        requires :id, type: Integer
      end
      post ':id/finalize' do
        require_workspace!

        bucket = policy_scope(Bucket).find(params[:id])
        authorize bucket, :update?

        error!({ error: 'Bucket is already finalized' }, 422) unless bucket.draft?

        bucket.finalize!

        present bucket, with: V1::Entities::Bucket
      end

      desc 'Share bucket with CA'
      params do
        requires :id, type: Integer
        requires :email, type: String
        optional :name, type: String
        optional :permission, type: String, values: %w[view download], default: 'download'
        optional :message, type: String
        optional :expires_in_days, type: Integer
      end
      post ':id/share' do
        require_workspace!

        bucket = policy_scope(Bucket).find(params[:id])
        authorize bucket, :share?

        expires_at = params[:expires_in_days].present? ? params[:expires_in_days].days.from_now : nil

        share = bucket.bucket_shares.create!(
          shared_by: current_user,
          shared_with_email: params[:email],
          shared_with_name: params[:name],
          permission: params[:permission],
          message: params[:message],
          expires_at: expires_at
        )

        bucket.update!(status: 'shared', shared_at: Time.current) if bucket.finalized?

        {
          success: true,
          share_url: share.share_url,
          access_token: share.access_token,
          expires_at: share.expires_at
        }
      end

      desc 'Auto-collect documents for month'
      params do
        requires :id, type: Integer
        optional :document_types, type: Array[String]
      end
      post ':id/auto-collect' do
        require_workspace!

        bucket = policy_scope(Bucket).find(params[:id])
        authorize bucket, :update?

        error!({ error: 'Can only auto-collect for monthly buckets' }, 422) unless bucket.monthly?
        error!({ error: 'Bucket is finalized' }, 422) if bucket.finalized?

        # Find documents from the bucket's month
        start_date = Date.new(bucket.year, bucket.month, 1)
        end_date = start_date.end_of_month

        documents = policy_scope(Document).by_date_range(start_date, end_date)
        documents = documents.where(document_type: params[:document_types]) if params[:document_types].present?

        added_count = 0
        documents.find_each do |doc|
          next if bucket.documents.include?(doc)
          bucket.add_document(doc)
          added_count += 1
        end

        {
          success: true,
          documents_added: added_count,
          total_documents: bucket.document_count
        }
      end
    end
  end
end
