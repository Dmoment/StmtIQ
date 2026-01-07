# frozen_string_literal: true

module V1
  module Entities
    # Compact invoice representation for transaction display
    class InvoiceCompact < Grape::Entity
      expose :id
      expose :vendor_name
      expose :invoice_number
      expose :invoice_date
      expose :total_amount
      expose :status
      expose :match_confidence
    end

    class Transaction < Grape::Entity
      expose :id
      expose :transaction_date
      expose :description
      expose :original_description
      expose :amount
      expose :transaction_type
      expose :balance
      expose :reference
      expose :confidence
      expose :ai_explanation
      expose :is_reviewed
      expose :categorization_status
      expose :metadata
      expose :created_at

      # Category and subcategory
      expose :category, using: V1::Entities::Category, if: ->(tx, _) { tx.category.present? }
      expose :ai_category, using: V1::Entities::Category, if: ->(tx, _) { tx.ai_category.present? }
      expose :subcategory, using: V1::Entities::Subcategory, if: ->(tx, _) { tx.subcategory.present? }

      # Transaction kind and counterparty (for transfers)
      expose :tx_kind
      expose :counterparty_name

      expose :account, using: V1::Entities::Account, if: ->(_, opts) { opts[:full] }

      # Linked invoice (if matched)
      expose :attached_invoice, as: :invoice, using: InvoiceCompact, if: ->(tx, _) { tx.attached_invoice.present? }

      expose :signed_amount do |transaction|
        transaction.signed_amount
      end
    end
  end
end
