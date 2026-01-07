# frozen_string_literal: true

module V1
  module Entities
    # Compact transaction representation for invoice matching
    # Defined first so it can be referenced by Invoice entity
    class TransactionCompact < Grape::Entity
      expose :id
      expose :description
      expose :amount
      expose :transaction_date
      expose :transaction_type
      expose :reference

      expose :category_name do |txn|
        txn.category&.name
      end

      expose :category_icon do |txn|
        txn.category&.icon
      end

      expose :account_name do |txn|
        txn.account&.name
      end
    end

    class Invoice < Grape::Entity
      expose :id
      expose :source
      expose :status
      expose :vendor_name
      expose :vendor_gstin
      expose :invoice_number
      expose :invoice_date
      expose :total_amount
      expose :currency
      expose :extraction_method
      expose :extraction_confidence
      expose :match_confidence
      expose :matched_at
      expose :matched_by
      expose :created_at
      expose :updated_at

      expose :file_url do |invoice|
        if invoice.file.attached?
          Rails.application.routes.url_helpers.rails_blob_path(invoice.file, only_path: true)
        end
      end

      expose :file_name do |invoice|
        invoice.file.filename.to_s if invoice.file.attached?
      end

      expose :file_content_type do |invoice|
        invoice.file.content_type if invoice.file.attached?
      end

      expose :matched_transaction, using: TransactionCompact, if: ->(invoice, options) {
        options[:full] && invoice.matched_transaction.present?
      }

      expose :extracted_data, if: ->(_, options) { options[:full] }

      expose :account, using: V1::Entities::Account, if: ->(invoice, options) {
        options[:full] && invoice.account.present?
      }
    end
  end
end
