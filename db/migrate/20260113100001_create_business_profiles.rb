# frozen_string_literal: true

class CreateBusinessProfiles < ActiveRecord::Migration[8.0]
  def change
    create_table :business_profiles do |t|
      t.references :workspace, null: false, foreign_key: true, index: { unique: true }

      # Business Identity
      t.string :business_name, null: false
      t.string :legal_name
      t.string :gstin
      t.string :pan_number

      # Address
      t.string :address_line1
      t.string :address_line2
      t.string :city
      t.string :state
      t.string :state_code, limit: 2
      t.string :pincode, limit: 10
      t.string :country, default: 'India'

      # Contact
      t.string :email
      t.string :phone

      # Bank Details
      t.string :bank_name
      t.string :account_number
      t.string :ifsc_code
      t.string :upi_id

      # Branding
      t.string :primary_color, default: '#f59e0b'
      t.string :secondary_color, default: '#1e293b'

      # Invoice Settings
      t.string :invoice_prefix, default: 'INV-'
      t.integer :invoice_next_number, default: 1
      t.integer :default_payment_terms_days, default: 30
      t.text :default_notes
      t.text :default_terms

      t.timestamps
    end

    add_index :business_profiles, :gstin, unique: true, where: "gstin IS NOT NULL"
  end
end
