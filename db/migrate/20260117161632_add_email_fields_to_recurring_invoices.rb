class AddEmailFieldsToRecurringInvoices < ActiveRecord::Migration[8.0]
  def change
    add_column :recurring_invoices, :send_cc_emails, :text
    add_column :recurring_invoices, :send_email_subject, :string
    add_column :recurring_invoices, :send_email_body, :text
  end
end
