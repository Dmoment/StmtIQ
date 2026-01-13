# frozen_string_literal: true

class AddInvoiceForeignKeys < ActiveRecord::Migration[8.0]
  def change
    # Add foreign key from sales_invoices to recurring_invoices
    add_foreign_key :sales_invoices, :recurring_invoices, column: :recurring_invoice_id

    # Add foreign key from recurring_invoices to sales_invoices
    add_foreign_key :recurring_invoices, :sales_invoices, column: :last_invoice_id

    # Add indexes for the foreign key columns
    add_index :sales_invoices, :recurring_invoice_id
    add_index :recurring_invoices, :last_invoice_id
  end
end
