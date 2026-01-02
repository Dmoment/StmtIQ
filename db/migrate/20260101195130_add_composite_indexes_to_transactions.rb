class AddCompositeIndexesToTransactions < ActiveRecord::Migration[8.0]
  def change
    # Index for user_id + transaction_date (for date range queries)
    add_index :transactions, [:user_id, :transaction_date], name: 'index_transactions_on_user_id_and_transaction_date'

    # Index for user_id + transaction_type (for debit/credit filtering)
    add_index :transactions, [:user_id, :transaction_type], name: 'index_transactions_on_user_id_and_transaction_type'

    # Index for user_id + category_id (for category grouping)
    add_index :transactions, [:user_id, :category_id], name: 'index_transactions_on_user_id_and_category_id'

    # Index for transaction_type + category_id (for by_category queries on debits)
    add_index :transactions, [:transaction_type, :category_id], name: 'index_transactions_on_transaction_type_and_category_id'
  end
end
