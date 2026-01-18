class AddSendToEmailToRecurringInvoices < ActiveRecord::Migration[8.0]
  def change
    add_column :recurring_invoices, :send_to_email, :string
  end
end
