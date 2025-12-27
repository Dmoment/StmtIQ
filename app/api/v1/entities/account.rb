# frozen_string_literal: true

module V1
  module Entities
    class Account < Grape::Entity
      expose :id
      expose :name
      expose :bank_name
      expose :account_number_last4
      expose :account_type
      expose :currency
      expose :is_active
      expose :created_at

      expose :display_name do |account|
        account.display_name
      end

      expose :current_balance, if: ->(_, opts) { opts[:full] } do |account|
        account.current_balance
      end
    end
  end
end
