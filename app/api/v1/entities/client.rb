# frozen_string_literal: true

module V1
  module Entities
    class Client < Grape::Entity
      expose :id
      expose :name
      expose :email
      expose :phone
      expose :company_name
      expose :gstin
      expose :pan
      expose :is_active

      # Logo
      expose :logo_url

      # Billing Address
      expose :billing_address_line1
      expose :billing_address_line2
      expose :billing_city
      expose :billing_state
      expose :billing_state_code
      expose :billing_pincode
      expose :billing_country

      # Shipping Address (only if exists)
      expose :shipping_address_line1, if: ->(client, _) { client.has_shipping_address? }
      expose :shipping_address_line2, if: ->(client, _) { client.has_shipping_address? }
      expose :shipping_city, if: ->(client, _) { client.has_shipping_address? }
      expose :shipping_state, if: ->(client, _) { client.has_shipping_address? }
      expose :shipping_state_code, if: ->(client, _) { client.has_shipping_address? }
      expose :shipping_pincode, if: ->(client, _) { client.has_shipping_address? }
      expose :shipping_country, if: ->(client, _) { client.has_shipping_address? }

      expose :default_currency
      expose :notes

      # Computed fields
      expose :display_name
      expose :full_billing_address

      # Stats (for detail view)
      expose :total_invoiced, if: ->(_, options) { options[:full] }
      expose :total_paid, if: ->(_, options) { options[:full] }
      expose :total_outstanding, if: ->(_, options) { options[:full] }

      expose :created_at
      expose :updated_at
    end
  end
end
