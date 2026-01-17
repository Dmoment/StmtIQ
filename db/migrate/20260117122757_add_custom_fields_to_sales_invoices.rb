class AddCustomFieldsToSalesInvoices < ActiveRecord::Migration[8.0]
  def change
    # Store custom fields as array of {label, value} objects
    # Example: [{"label": "LUT Number", "value": "AD123456"}, {"label": "PO Number", "value": "PO-001"}]
    add_column :sales_invoices, :custom_fields, :jsonb, default: []
  end
end
