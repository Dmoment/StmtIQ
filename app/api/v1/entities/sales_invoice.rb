# frozen_string_literal: true

module V1
  module Entities
    class SalesInvoice < Grape::Entity
      expose :id
      expose :invoice_number
      expose :status
      expose :invoice_date
      expose :due_date
      expose :currency

      # Amounts
      expose :subtotal
      expose :discount_amount
      expose :discount_type
      expose :total_amount
      expose :amount_paid
      expose :balance_due

      # Tax
      expose :tax_type
      expose :cgst_rate
      expose :cgst_amount
      expose :sgst_rate
      expose :sgst_amount
      expose :igst_rate
      expose :igst_amount
      expose :place_of_supply
      expose :is_reverse_charge
      expose :cess_rate
      expose :cess_amount

      expose :tax_total

      # Currency conversion
      expose :exchange_rate
      expose :exchange_rate_date
      expose :amount_in_inr

      # Branding
      expose :primary_color
      expose :secondary_color
      expose :effective_primary_color
      expose :effective_secondary_color

      # Content
      expose :notes
      expose :terms

      # Custom fields (label/value pairs like LUT Number, PO Number, etc.)
      expose :custom_fields

      # Status helpers
      expose :days_until_due
      expose :days_overdue
      expose :can_edit?, as: :can_edit
      expose :can_send?, as: :can_send

      # Tracking
      expose :sent_at
      expose :viewed_at
      expose :paid_at
      expose :pdf_generated_at

      # Associations
      expose :client, using: V1::Entities::Client, if: ->(_, options) { options[:full] }
      expose :business_profile, using: V1::Entities::BusinessProfile, if: ->(_, options) { options[:full] }
      expose :line_items, using: V1::Entities::InvoiceLineItem

      # Recurring invoice association
      expose :recurring_invoice_id
      expose :recurring_invoice, using: V1::Entities::RecurringInvoice, if: ->(invoice, options) {
        options[:full] && invoice.recurring_invoice_id.present?
      }

      # Simplified client info for list view
      expose :client_name do |invoice|
        invoice.client&.display_name
      end

      expose :client_email do |invoice|
        invoice.client&.email
      end

      expose :created_at
      expose :updated_at
    end
  end
end
