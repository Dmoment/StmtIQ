class CreateInvoices < ActiveRecord::Migration[8.0]
  def change
    create_table :invoices do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.references :account, foreign_key: { on_delete: :nullify }

      # Source tracking
      t.string :source, null: false, default: 'upload' # upload, gmail
      t.string :gmail_message_id

      # Extracted/Entered data
      t.string :vendor_name
      t.string :vendor_gstin, limit: 20
      t.string :invoice_number, limit: 100
      t.date :invoice_date
      t.decimal :total_amount, precision: 15, scale: 2
      t.string :currency, limit: 3, default: 'INR'

      # Extraction metadata
      t.jsonb :extracted_data, default: {}
      t.string :extraction_method, limit: 20
      t.decimal :extraction_confidence, precision: 3, scale: 2

      # Matching status
      t.string :status, null: false, default: 'pending'
      t.references :matched_transaction, foreign_key: { to_table: :transactions, on_delete: :nullify }, index: false
      t.decimal :match_confidence, precision: 3, scale: 2
      t.datetime :matched_at
      t.string :matched_by, limit: 20

      t.timestamps
    end

    # Indexes for common queries
    add_index :invoices, [:user_id, :status]
    add_index :invoices, [:user_id, :invoice_date]
    add_index :invoices, [:user_id, :total_amount]
    add_index :invoices, :gmail_message_id, where: 'gmail_message_id IS NOT NULL'
    add_index :invoices, :matched_transaction_id, unique: true, where: 'matched_transaction_id IS NOT NULL'

    # Add invoice reference to transactions for reverse lookup
    add_reference :transactions, :invoice, foreign_key: { on_delete: :nullify }
  end
end
