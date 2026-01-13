# frozen_string_literal: true

class CreateInvoiceLineItems < ActiveRecord::Migration[8.0]
  def change
    create_table :invoice_line_items do |t|
      t.references :sales_invoice, null: false, foreign_key: true

      # Ordering
      t.integer :position, null: false, default: 0

      # Item Details
      t.string :description, null: false
      t.string :hsn_sac_code

      # Quantity & Pricing
      t.decimal :quantity, precision: 10, scale: 2, null: false, default: 1
      t.string :unit, default: 'units'
      t.decimal :rate, precision: 15, scale: 2, null: false, default: 0
      t.decimal :amount, precision: 15, scale: 2, null: false, default: 0

      # Item-level tax (optional, for mixed tax rates)
      t.decimal :tax_rate, precision: 5, scale: 2

      t.timestamps
    end

    add_index :invoice_line_items, [:sales_invoice_id, :position]
  end
end
