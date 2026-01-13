# frozen_string_literal: true

class CreateSalesInvoices < ActiveRecord::Migration[8.0]
  def change
    create_table :sales_invoices do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :client, null: false, foreign_key: true
      t.references :business_profile, null: false, foreign_key: true

      # Invoice Identity
      t.string :invoice_number, null: false
      t.string :status, null: false, default: 'draft'

      # Dates
      t.date :invoice_date, null: false
      t.date :due_date, null: false

      # Currency
      t.string :currency, null: false, default: 'INR'
      t.decimal :exchange_rate, precision: 10, scale: 4, default: 1.0
      t.date :exchange_rate_date

      # Amounts
      t.decimal :subtotal, precision: 15, scale: 2, default: 0
      t.decimal :discount_amount, precision: 15, scale: 2, default: 0
      t.string :discount_type, default: 'fixed'

      # Tax (GST)
      t.string :tax_type
      t.decimal :cgst_rate, precision: 5, scale: 2
      t.decimal :cgst_amount, precision: 15, scale: 2, default: 0
      t.decimal :sgst_rate, precision: 5, scale: 2
      t.decimal :sgst_amount, precision: 15, scale: 2, default: 0
      t.decimal :igst_rate, precision: 5, scale: 2
      t.decimal :igst_amount, precision: 15, scale: 2, default: 0

      # Totals
      t.decimal :total_amount, precision: 15, scale: 2, default: 0
      t.decimal :amount_paid, precision: 15, scale: 2, default: 0
      t.decimal :balance_due, precision: 15, scale: 2, default: 0

      # Content
      t.text :notes
      t.text :terms

      # Branding (override business profile)
      t.string :primary_color
      t.string :secondary_color

      # Tracking
      t.datetime :sent_at
      t.datetime :viewed_at
      t.datetime :paid_at
      t.datetime :pdf_generated_at

      # Relationships (foreign keys added later after recurring_invoices table exists)
      t.bigint :recurring_invoice_id
      t.references :matched_transaction, foreign_key: { to_table: :transactions }

      t.timestamps
    end

    add_index :sales_invoices, [:workspace_id, :invoice_number], unique: true
    add_index :sales_invoices, [:workspace_id, :status]
    add_index :sales_invoices, [:workspace_id, :invoice_date]
    add_index :sales_invoices, [:workspace_id, :due_date]
    add_index :sales_invoices, [:client_id, :status]
  end
end
