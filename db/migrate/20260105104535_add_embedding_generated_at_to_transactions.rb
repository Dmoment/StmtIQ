class AddEmbeddingGeneratedAtToTransactions < ActiveRecord::Migration[8.0]
  def change
    add_column :transactions, :embedding_generated_at, :datetime

    # Index for finding transactions that need embedding generation
    # Partial index: only index NULL values (transactions needing embeddings)
    add_index :transactions, :embedding_generated_at,
              where: "embedding_generated_at IS NULL",
              name: "idx_transactions_needs_embedding"

    # Index for efficient batch queries by user
    add_index :transactions, %i[user_id embedding_generated_at],
              name: "idx_transactions_user_embedding_status"
  end
end
