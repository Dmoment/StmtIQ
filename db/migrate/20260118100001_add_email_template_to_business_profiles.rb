# frozen_string_literal: true

class AddEmailTemplateToBusinessProfiles < ActiveRecord::Migration[8.0]
  DEFAULT_SUBJECT = 'Invoice {invoice_number} from {business_name}'
  DEFAULT_BODY = <<~BODY.freeze
    Dear {client_name},

    Please find attached invoice {invoice_number} for {amount}.

    Payment is due by {due_date}.

    Best regards,
    {business_name}
  BODY

  def change
    add_column :business_profiles, :invoice_email_subject, :string,
               default: DEFAULT_SUBJECT
    add_column :business_profiles, :invoice_email_body, :text,
               default: DEFAULT_BODY.strip
    add_column :business_profiles, :invoice_email_cc, :string
  end
end
