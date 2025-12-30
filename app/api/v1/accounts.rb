# frozen_string_literal: true

module V1
  class Accounts < Grape::API
    resource :accounts do
      desc 'List all accounts with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 25
        optional :q, type: Hash, desc: 'Ransack query params'
      end
      get do
        authenticate!

        accounts = current_user.accounts

        if params[:q].present?
          accounts = accounts.ransack(params[:q]).result(distinct: true)
        end

        paginate_collection(accounts) do |account|
          V1::Entities::Account.represent(account)
        end
      end

      desc 'Get a single account'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        authenticate!

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
        authenticate!

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
        authenticate!

        account = current_user.accounts.find(params[:id])
        account.update!(declared(params, include_missing: false).except(:id))

        present account, with: V1::Entities::Account
      end

      desc 'Delete an account'
      params do
        requires :id, type: Integer
      end
      delete ':id' do
        authenticate!

        account = current_user.accounts.find(params[:id])
        account.destroy!

        { success: true }
      end

      desc 'Get account summary'
      params do
        requires :id, type: Integer
        optional :q, type: Hash, desc: 'Ransack query params for transactions'
      end
      get ':id/summary' do
        authenticate!

        account = current_user.accounts.find(params[:id])
        transactions = account.transactions

        if params[:q].present?
          transactions = transactions.ransack(params[:q]).result(distinct: true)
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
