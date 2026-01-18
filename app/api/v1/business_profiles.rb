# frozen_string_literal: true

module V1
  class BusinessProfiles < Grape::API
    resource :business_profile do
      before { authenticate! }

      desc 'Get current workspace business profile'
      get do
        require_workspace!

        profile = current_workspace.business_profile
        error!({ error: 'Business profile not found' }, 404) unless profile

        present profile, with: V1::Entities::BusinessProfile
      end

      desc 'Create business profile for current workspace'
      params do
        requires :business_name, type: String

        optional :legal_name, type: String
        optional :gstin, type: String
        optional :pan_number, type: String

        optional :address_line1, type: String
        optional :address_line2, type: String
        optional :city, type: String
        optional :state, type: String
        optional :state_code, type: String
        optional :pincode, type: String
        optional :country, type: String

        optional :email, type: String
        optional :phone, type: String

        optional :bank_name, type: String
        optional :account_number, type: String
        optional :ifsc_code, type: String
        optional :upi_id, type: String

        optional :primary_color, type: String
        optional :secondary_color, type: String

        optional :invoice_prefix, type: String
        optional :invoice_next_number, type: Integer
        optional :default_payment_terms_days, type: Integer
        optional :default_notes, type: String
        optional :default_terms, type: String

        optional :invoice_email_subject, type: String
        optional :invoice_email_body, type: String
        optional :invoice_email_cc, type: String
      end
      post do
        require_workspace!
        authorize BusinessProfile, :create?

        error!({ error: 'Business profile already exists' }, 422) if current_workspace.business_profile

        profile = current_workspace.build_business_profile(declared(params, include_missing: false))
        profile.save!

        present profile, with: V1::Entities::BusinessProfile
      end

      desc 'Update business profile'
      params do
        optional :business_name, type: String
        optional :legal_name, type: String
        optional :gstin, type: String
        optional :pan_number, type: String

        optional :address_line1, type: String
        optional :address_line2, type: String
        optional :city, type: String
        optional :state, type: String
        optional :state_code, type: String
        optional :pincode, type: String
        optional :country, type: String

        optional :email, type: String
        optional :phone, type: String

        optional :bank_name, type: String
        optional :account_number, type: String
        optional :ifsc_code, type: String
        optional :upi_id, type: String

        optional :primary_color, type: String
        optional :secondary_color, type: String

        optional :invoice_prefix, type: String
        optional :invoice_next_number, type: Integer
        optional :default_payment_terms_days, type: Integer
        optional :default_notes, type: String
        optional :default_terms, type: String

        optional :invoice_email_subject, type: String
        optional :invoice_email_body, type: String
        optional :invoice_email_cc, type: String
      end
      patch do
        require_workspace!

        profile = current_workspace.business_profile
        error!({ error: 'Business profile not found' }, 404) unless profile

        authorize profile, :update?
        profile.update!(declared(params, include_missing: false))

        present profile, with: V1::Entities::BusinessProfile
      end

      desc 'Upload logo'
      params do
        requires :file, type: File
      end
      post :logo do
        require_workspace!

        profile = current_workspace.business_profile
        error!({ error: 'Business profile not found' }, 404) unless profile

        authorize profile, :update?

        uploaded_file = params[:file]
        content_type = uploaded_file[:type]

        unless %w[image/png image/jpeg image/jpg image/gif image/webp].include?(content_type)
          error!({ error: 'Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed.' }, 422)
        end

        profile.logo.attach(
          io: uploaded_file[:tempfile],
          filename: uploaded_file[:filename],
          content_type: content_type
        )

        present profile, with: V1::Entities::BusinessProfile
      end

      desc 'Upload signature'
      params do
        requires :file, type: File
      end
      post :signature do
        require_workspace!

        profile = current_workspace.business_profile
        error!({ error: 'Business profile not found' }, 404) unless profile

        authorize profile, :update?

        uploaded_file = params[:file]
        content_type = uploaded_file[:type]

        unless %w[image/png image/jpeg image/jpg].include?(content_type)
          error!({ error: 'Invalid file type. Only PNG and JPEG are allowed.' }, 422)
        end

        profile.signature.attach(
          io: uploaded_file[:tempfile],
          filename: uploaded_file[:filename],
          content_type: content_type
        )

        present profile, with: V1::Entities::BusinessProfile
      end
    end
  end
end
