# frozen_string_literal: true

module V1
  class Transactions < Grape::API
    resource :transactions do
      desc 'List all transactions with filtering and pagination'
      params do
        optional :page, type: Integer, default: 1
        optional :per_page, type: Integer, default: 50
        optional :q, type: Hash, desc: 'Ransack query params'
      end
      get do
        authenticate!

        transactions = current_user.transactions.includes(:category, :account).recent

        if params[:q].present?
          transactions = transactions.ransack(params[:q]).result(distinct: true)
        end

        paginate_collection(transactions) do |transaction|
          V1::Entities::Transaction.represent(transaction)
        end
      end

      desc 'Get a single transaction'
      params do
        requires :id, type: Integer
      end
      get ':id' do
        authenticate!

        transaction = current_user.transactions.find(params[:id])
        present transaction, with: V1::Entities::Transaction, full: true
      end

      desc 'Update a transaction'
      params do
        requires :id, type: Integer
        optional :category_id, type: Integer
        optional :description, type: String
        optional :is_reviewed, type: Boolean
      end
      patch ':id' do
        authenticate!

        transaction = current_user.transactions.find(params[:id])
        transaction.update!(declared(params, include_missing: false).except(:id))
        transaction.reload

        present transaction, with: V1::Entities::Transaction
      end

      desc 'Bulk update transactions'
      params do
        requires :transaction_ids, type: Array[Integer]
        optional :category_id, type: Integer
        optional :is_reviewed, type: Boolean
      end
      patch :bulk do
        authenticate!

        transactions = current_user.transactions.where(id: params[:transaction_ids])
        update_params = declared(params, include_missing: false).except(:transaction_ids)

        transactions.update_all(update_params)

        { updated_count: transactions.count }
      end

      desc 'Get transaction statistics'
      params do
        optional :q, type: Hash, desc: 'Ransack query params'
      end
      get :stats do
        authenticate!

        transactions = current_user.transactions

        if params[:q].present?
          transactions = transactions.ransack(params[:q]).result(distinct: true)
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
        authenticate!

        transactions = current_user.transactions.uncategorized.limit(100)

        if transactions.empty?
          return { message: 'No uncategorized transactions found' }
        end

        AICategorizeJob.perform_later(transactions.pluck(:id))

        { queued: transactions.count, message: 'Categorization started' }
      end
    end
  end
end
