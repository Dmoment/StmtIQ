# frozen_string_literal: true

module V1
  class Uploads < Grape::API
    resource :uploads do
      desc 'Get presigned URL for direct S3 upload', {
        success: V1::Entities::PresignedUpload,
        failure: [{ code: 422, message: 'Invalid file type' }]
      }
      params do
        requires :filename, type: String, desc: 'Original filename'
        requires :content_type, type: String, desc: 'File MIME type'
        optional :file_size, type: Integer, desc: 'File size in bytes'
      end
      post :presign do
        authenticate!

        service = ::Uploads::PresignedUrlService.new(
          user_id: current_user.id,
          filename: params[:filename],
          content_type: params[:content_type],
          file_size: params[:file_size]
        )

        result = service.call
        present result, with: V1::Entities::PresignedUpload
      rescue ::Uploads::PresignedUrlService::InvalidFileTypeError => e
        error!({ error: e.message }, 422)
      end

      desc 'Confirm upload and create statement', {
        success: V1::Entities::Statement,
        failure: [
          { code: 404, message: 'Upload not found in S3' },
          { code: 422, message: 'File format mismatch' }
        ]
      }
      params do
        requires :s3_key, type: String, desc: 'S3 key from presign response'
        requires :filename, type: String, desc: 'Original filename'
        requires :template_id, type: Integer, desc: 'Bank template ID'
        optional :account_id, type: Integer, desc: 'Associated account'
        optional :file_size, type: Integer, desc: 'File size in bytes'
      end
      post :confirm do
        authenticate!

        service = ::Uploads::ConfirmUploadService.new(
          user: current_user,
          s3_key: params[:s3_key],
          filename: params[:filename],
          template_id: params[:template_id],
          account_id: params[:account_id]
        )

        statement = service.call
        present statement, with: V1::Entities::Statement
      rescue ::Uploads::ConfirmUploadService::UploadNotFoundError => e
        error!({ error: e.message }, 404)
      rescue ::Uploads::ConfirmUploadService::FileFormatMismatchError => e
        error!({ error: e.message }, 422)
      rescue ActiveRecord::RecordNotFound => e
        error!({ error: "Bank template not found" }, 404)
      end
    end
  end
end
