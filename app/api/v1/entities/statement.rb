# frozen_string_literal: true

module V1
  module Entities
    class Statement < Grape::Entity
      expose :id
      expose :file_name
      expose :file_type
      expose :status
      expose :parsed_at
      expose :error_message
      expose :created_at
      expose :updated_at

      expose :account, using: V1::Entities::Account, if: ->(_, opts) { opts[:full] }

      expose :transaction_count do |statement|
        statement.transactions.count
      end

      expose :total_debits do |statement|
        statement.total_debits
      end

      expose :total_credits do |statement|
        statement.total_credits
      end
    end
  end
end
