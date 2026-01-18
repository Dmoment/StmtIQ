# frozen_string_literal: true

module V1
  module Entities
    class BusinessProfile < Grape::Entity
      expose :id
      expose :business_name
      expose :legal_name
      expose :gstin
      # Expose as 'pan' for frontend consistency (database column is pan_number)
      expose :pan_number, as: :pan

      # Address
      expose :address_line1
      expose :address_line2
      expose :city
      expose :state
      expose :state_code
      expose :pincode
      expose :country

      # Contact
      expose :email
      expose :phone

      # Bank Details
      expose :bank_name
      expose :account_number
      expose :ifsc_code
      expose :upi_id

      # Branding
      expose :primary_color
      expose :secondary_color

      # Invoice Settings
      expose :invoice_prefix
      expose :invoice_next_number
      expose :default_payment_terms_days
      expose :default_notes
      expose :default_terms

      # Email Template Settings
      expose :invoice_email_subject
      expose :invoice_email_body
      expose :invoice_email_cc

      # Files
      expose :logo_url do |profile|
        profile.logo_url
      end

      expose :signature_url do |profile|
        profile.signature_url
      end

      expose :created_at
      expose :updated_at
    end
  end
end
