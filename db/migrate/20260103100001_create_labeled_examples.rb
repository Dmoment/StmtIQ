# frozen_string_literal: true

class CreateLabeledExamples < ActiveRecord::Migration[8.0]
  def change
    create_table :labeled_examples do |t|
      t.references :user, null: false, foreign_key: true
      t.references :category, null: false, foreign_key: true
      t.references :transaction, foreign_key: true

      # The text that was categorized
      t.text :description, null: false
      t.string :normalized_description

      # Metadata
      t.string :source, default: 'user_feedback' # user_feedback, import, seed
      t.decimal :amount
      t.string :transaction_type

      t.timestamps
    end

    # Add embedding column using pgvector (same as transactions table)
    add_column :labeled_examples, :embedding, :vector, limit: 1536

    # Index for embedding similarity search
    add_index :labeled_examples, [:user_id, :category_id],
      name: 'idx_labeled_examples_user_category'

    # Unique constraint to prevent duplicates
    add_index :labeled_examples, [:user_id, :normalized_description],
      unique: true, name: 'idx_labeled_examples_unique'
  end
end
