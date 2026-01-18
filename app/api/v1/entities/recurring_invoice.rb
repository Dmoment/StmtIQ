# frozen_string_literal: true

module V1
  module Entities
    class RecurringInvoice < Grape::Entity
      expose :id
      expose :name
      expose :frequency
      expose :status
      expose :start_date
      expose :end_date
      expose :next_run_date

      expose :auto_send
      expose :send_days_before_due
      expose :send_to_email
      expose :send_cc_emails
      expose :send_email_subject
      expose :send_email_body

      expose :currency
      expose :payment_terms_days
      expose :tax_rate

      expose :invoice_count
      expose :last_run_at

      # Computed fields
      expose :frequency_display

      # Template data (for editing)
      expose :template_data, if: ->(_, options) { options[:full] }

      # Associations
      expose :client, using: V1::Entities::Client, if: ->(_, options) { options[:full] }
      expose :last_invoice, using: V1::Entities::SalesInvoice, if: ->(_, options) { options[:full] }

      # Simplified info for list view
      expose :client_name do |recurring|
        recurring.client&.display_name
      end

      expose :created_at
      expose :updated_at
    end
  end
end
