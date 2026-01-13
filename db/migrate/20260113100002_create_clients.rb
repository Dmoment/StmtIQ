# frozen_string_literal: true

class CreateClients < ActiveRecord::Migration[8.0]
  def change
    create_table :clients do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      # Basic Info
      t.string :name, null: false
      t.string :email
      t.string :phone
      t.string :company_name
      t.string :gstin

      # Billing Address
      t.string :billing_address_line1
      t.string :billing_address_line2
      t.string :billing_city
      t.string :billing_state
      t.string :billing_state_code, limit: 2
      t.string :billing_pincode, limit: 10
      t.string :billing_country, default: 'India'

      # Shipping Address (optional, different from billing)
      t.string :shipping_address_line1
      t.string :shipping_address_line2
      t.string :shipping_city
      t.string :shipping_state
      t.string :shipping_state_code, limit: 2
      t.string :shipping_pincode, limit: 10
      t.string :shipping_country

      # Preferences
      t.string :default_currency, default: 'INR'
      t.text :notes

      # Status
      t.boolean :is_active, default: true

      t.timestamps
    end

    add_index :clients, [:workspace_id, :email], unique: true, where: "email IS NOT NULL"
    add_index :clients, [:workspace_id, :gstin], unique: true, where: "gstin IS NOT NULL"
    add_index :clients, [:workspace_id, :is_active]
  end
end
