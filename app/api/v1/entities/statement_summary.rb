# frozen_string_literal: true

module V1
  module Entities
    class StatementSummary < Grape::Entity
      expose :id
      expose :status
      expose :transaction_count
      expose :account_type do |statement|
        statement.bank_template&.account_type || 'unknown'
      end

      # Credit card specific fields
      expose :total_spent, if: ->(statement, _) { statement.credit_card? } do |statement|
        statement.total_spent.to_s
      end

      expose :payments_made, if: ->(statement, _) { statement.credit_card? } do |statement|
        statement.payments_made.to_s
      end

      expose :outstanding_balance, if: ->(statement, _) { statement.credit_card? } do |statement|
        statement.outstanding_balance.to_s
      end

      expose :amount_due, if: ->(statement, _) { statement.credit_card? } do |statement|
        statement.amount_due.to_s
      end

      expose :statement_period, if: ->(statement, _) { statement.credit_card? } do |statement|
        period = statement.statement_period
        if period
          {
            start: period[:start],
            end: period[:end]
          }
        else
          nil
        end
      end

      # Regular account fields (savings/current)
      expose :total_debits, if: ->(statement, _) { !statement.credit_card? } do |statement|
        statement.total_debits.to_s
      end

      expose :total_credits, if: ->(statement, _) { !statement.credit_card? } do |statement|
        statement.total_credits.to_s
      end

      expose :net, if: ->(statement, _) { !statement.credit_card? } do |statement|
        (statement.total_credits - statement.total_debits).to_s
      end

      expose :date_range, if: ->(statement, _) { !statement.credit_card? } do |statement|
        if statement.transactions.any?
          {
            start: statement.transactions.minimum(:transaction_date),
            end: statement.transactions.maximum(:transaction_date)
          }
        else
          {
            start: nil,
            end: nil
          }
        end
      end

      # Common fields
      expose :categories do |statement|
        statement.transactions.group(:category_id).count
      end
    end
  end
end
