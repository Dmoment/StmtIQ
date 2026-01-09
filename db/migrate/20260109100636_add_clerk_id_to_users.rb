# frozen_string_literal: true

class AddClerkIdToUsers < ActiveRecord::Migration[8.0]
  def change
    # Add clerk_id for Clerk authentication
    add_column :users, :clerk_id, :string
    add_index :users, :clerk_id, unique: true, where: "clerk_id IS NOT NULL"

    # Add auth_provider to track authentication source
    add_column :users, :auth_provider, :string, default: 'clerk'

    # Make phone_number optional (Clerk is now source of truth)
    # Remove the strict unique index and replace with partial index
    remove_index :users, :phone_number
    change_column_null :users, :phone_number, true
    add_index :users, :phone_number, unique: true, where: "phone_number IS NOT NULL"
  end
end
