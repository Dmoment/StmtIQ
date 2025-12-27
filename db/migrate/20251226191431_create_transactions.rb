class CreateTransactions < ActiveRecord::Migration[8.0]
  def change
    create_table :transactions do |t|
      t.references :statement, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :category, null: false, foreign_key: true
      t.date :transaction_date
      t.text :description
      t.text :original_description
      t.decimal :amount
      t.string :transaction_type
      t.decimal :balance
      t.string :reference
      t.integer :ai_category_id
      t.decimal :confidence
      t.text :ai_explanation
      t.boolean :is_reviewed
      t.jsonb :metadata

      t.timestamps
    end
  end
end
