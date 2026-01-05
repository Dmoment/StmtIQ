# frozen_string_literal: true

class CreateSubcategories < ActiveRecord::Migration[8.0]
  def change
    create_table :subcategories do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :description
      t.string :icon
      t.references :category, null: false, foreign_key: true

      # Keywords for rule-based matching
      t.text :keywords, array: true, default: []

      # Display order within category
      t.integer :display_order, default: 0

      # Is this the default subcategory for the category?
      t.boolean :is_default, default: false

      t.timestamps
    end

    add_index :subcategories, :slug, unique: true
    add_index :subcategories, [:category_id, :slug], unique: true
    add_index :subcategories, [:category_id, :is_default]

    # Add subcategory to transactions
    add_reference :transactions, :subcategory, foreign_key: true, null: true

    # Add counterparty tracking for transfers
    add_column :transactions, :counterparty_name, :string
    add_column :transactions, :tx_kind, :string  # spend, transfer_p2p, transfer_self, income, etc.

    add_index :transactions, :tx_kind
  end
end
