# frozen_string_literal: true

class CreateRecurringInvoices < ActiveRecord::Migration[8.0]
  def change
    create_table :recurring_invoices do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :client, null: false, foreign_key: true
      t.references :business_profile, null: false, foreign_key: true

      # Schedule Info
      t.string :name, null: false
      t.string :frequency, null: false
      t.date :start_date, null: false
      t.date :end_date
      t.date :next_run_date
      t.string :status, null: false, default: 'active'

      # Auto-send settings
      t.boolean :auto_send, default: false
      t.integer :send_days_before_due, default: 0

      # Template Data (line items, notes, terms stored as JSON)
      t.jsonb :template_data, default: {}

      # Invoice defaults
      t.string :currency, default: 'INR'
      t.integer :payment_terms_days, default: 30
      t.decimal :tax_rate, precision: 5, scale: 2

      # Tracking (foreign key added later after both tables exist)
      t.bigint :last_invoice_id
      t.integer :invoice_count, default: 0
      t.datetime :last_run_at

      t.timestamps
    end

    add_index :recurring_invoices, [:workspace_id, :status]
    add_index :recurring_invoices, [:status, :next_run_date]
  end
end
