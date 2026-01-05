class AddEmbeddingToTransactions < ActiveRecord::Migration[8.0]
  def change
    # Add embedding column using pgvector
    # OpenAI embeddings are 1536 dimensions
    add_column :transactions, :embedding, :vector, limit: 1536

    # Note: ivfflat index requires data to exist first
    # We'll create it later via a rake task or when we have embeddings
    # For now, we'll use sequential scan which works fine for small datasets

    # Add index for transactions with embeddings (for filtering)
    add_index :transactions, [:user_id, :ai_category_id],
      where: 'embedding IS NOT NULL',
      name: 'index_transactions_on_user_and_ai_category_with_embedding'
  end
end
