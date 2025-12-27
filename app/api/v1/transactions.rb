# frozen_string_literal: true

module V1
  class Transactions < Grape::API
    resource :transactions do
      desc 'List all transactions'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 50
        optional :category_id, type: Integer
        optional :account_id, type: Integer
        optional :statement_id, type: Integer
        optional :transaction_type, type: String, values: %w[debit credit]
        optional :start_date, type: Date
        optional :end_date, type: Date
        optional :search, type: String
        optional :uncategorized, type: Boolean
      end
      get do
        require_authentication!

        transactions = current_user.transactions.recent

        if params[:category_id]
          transactions = transactions.where(category_id: params[:category_id])
        end

        if params[:account_id]
          transactions = transactions.where(account_id: params[:account_id])
        end

        if params[:statement_id]
          transactions = transactions.where(statement_id: params[:statement_id])
        end

        if params[:transaction_type]
          transactions = transactions.where(transaction_type: params[:transaction_type])
        end

        if params[:start_date] && params[:end_date]
          transactions = transactions.by_date_range(params[:start_date], params[:end_date])
        end

        if params[:search].present?
          transactions = transactions.where('description ILIKE ?', "%#{params[:search]}%")
        end

        if params[:uncategorized]
          transactions = transactions.uncategorized
        end

        transactions = transactions.page(params[:page]).per(params[:per_page])

        present transactions, with: V1::Entities::Transaction
      end

      desc 'Get a single transaction'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        require_authentication!

        transaction = current_user.transactions.find(params[:id])
        present transaction, with: V1::Entities::Transaction, full: true
      end

      desc 'Update a transaction (category, description, etc.)'
      params do
        requires :id, type: Integer
        optional :category_id, type: Integer
        optional :description, type: String
        optional :is_reviewed, type: Boolean
      end
      patch ':id' do
        require_authentication!

        transaction = current_user.transactions.find(params[:id])
        transaction.update!(declared(params, include_missing: false).except(:id))

        present transaction, with: V1::Entities::Transaction
      end

      desc 'Bulk update transactions'
      params do
        requires :transaction_ids, type: Array[Integer]
        optional :category_id, type: Integer
        optional :is_reviewed, type: Boolean
      end
      patch :bulk do
        require_authentication!

        transactions = current_user.transactions.where(id: params[:transaction_ids])
        update_params = declared(params, include_missing: false).except(:transaction_ids)

        transactions.update_all(update_params)

        { updated_count: transactions.count }
      end

      desc 'Get transaction statistics'
      params do
        optional :start_date, type: Date
        optional :end_date, type: Date
        optional :account_id, type: Integer
      end
      get :stats do
        require_authentication!

        transactions = current_user.transactions

        if params[:account_id]
          transactions = transactions.where(account_id: params[:account_id])
        end

        if params[:start_date] && params[:end_date]
          transactions = transactions.by_date_range(params[:start_date], params[:end_date])
        end

        debits = transactions.debits
        credits = transactions.credits

        {
          total_transactions: transactions.count,
          total_debits: debits.sum(:amount),
          total_credits: credits.sum(:amount),
          net: credits.sum(:amount) - debits.sum(:amount),
          by_category: transactions.group(:category_id).sum(:amount),
          by_type: {
            debit: debits.count,
            credit: credits.count
          },
          uncategorized_count: transactions.uncategorized.count
        }
      end

      desc 'Categorize uncategorized transactions with AI'
      post :categorize do
        require_authentication!

        transactions = current_user.transactions.uncategorized.limit(100)

        if transactions.empty?
          return { message: 'No uncategorized transactions found' }
        end

        # Queue categorization job
        AICategorizeJob.perform_later(transactions.pluck(:id))

        { queued: transactions.count, message: 'Categorization started' }
      end
    end
  end
end
