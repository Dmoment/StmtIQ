# frozen_string_literal: true

class AddGstFieldsToSalesInvoices < ActiveRecord::Migration[8.0]
  def change
    # Add GST compliance fields to sales_invoices
    add_column :sales_invoices, :place_of_supply, :string, limit: 2
    add_column :sales_invoices, :is_reverse_charge, :boolean, default: false, null: false
    add_column :sales_invoices, :cess_rate, :decimal, precision: 5, scale: 2, default: 0
    add_column :sales_invoices, :cess_amount, :decimal, precision: 15, scale: 2, default: 0

    # Add index for place of supply queries
    add_index :sales_invoices, :place_of_supply
    add_index :sales_invoices, :is_reverse_charge

    # Add GST rate to line items for per-item tax calculation
    add_column :invoice_line_items, :gst_rate, :decimal, precision: 5, scale: 2, default: 18
    add_column :invoice_line_items, :tax_amount, :decimal, precision: 15, scale: 2, default: 0
  end
end
