# frozen_string_literal: true

module V1
  class Accounts < Grape::API
    resource :accounts do
      desc 'List all accounts'
      get do
        require_authentication!

        accounts = current_user.accounts.active
        present accounts, with: V1::Entities::Account
      end

      desc 'Get a single account'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_authentication!

        account = current_user.accounts.find(params[:id])
        present account, with: V1::Entities::Account, full: true
      end

      desc 'Create an account'
      params do
        requires :name, type: String
        requires :bank_name, type: String
        optional :account_number_last4, type: String
        optional :account_type, type: String, values: Account::ACCOUNT_TYPES
        optional :currency, type: String, values: Account::CURRENCIES, default: 'INR'
      end
      post do
        require_authentication!

        account = current_user.accounts.create!(declared(params))
        present account, with: V1::Entities::Account
      end

      desc 'Update an account'
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :bank_name, type: String
        optional :account_number_last4, type: String
        optional :account_type, type: String, values: Account::ACCOUNT_TYPES
        optional :is_active, type: Boolean
      end
      patch ':id' do
        require_authentication!

        account = current_user.accounts.find(params[:id])
        account.update!(declared(params, include_missing: false).except(:id))

        present account, with: V1::Entities::Account
      end

      desc 'Delete an account'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        require_authentication!

        account = current_user.accounts.find(params[:id])
        account.destroy!

        { success: true }
      end

      desc 'Get account summary'
      params do
        requires :id, type: Integer
        optional :start_date, type: Date
        optional :end_date, type: Date
      end
      get ':id/summary' do
        require_authentication!

        account = current_user.accounts.find(params[:id])
        transactions = account.transactions

        if params[:start_date] && params[:end_date]
          transactions = transactions.by_date_range(params[:start_date], params[:end_date])
        end

        {
          id: account.id,
          name: account.name,
          current_balance: account.current_balance,
          transaction_count: transactions.count,
          total_debits: transactions.debits.sum(:amount),
          total_credits: transactions.credits.sum(:amount)
        }
      end
    end
  end
end
