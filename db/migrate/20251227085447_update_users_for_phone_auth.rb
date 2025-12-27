# frozen_string_literal: true

class UpdateUsersForPhoneAuth < ActiveRecord::Migration[8.0]
  def change
    # Remove Auth0-related columns
    remove_index :users, :auth0_id
    remove_column :users, :auth0_id, :string

    # Add phone-based auth columns
    add_column :users, :phone_number, :string
    add_column :users, :phone_verified, :boolean, default: false
    add_column :users, :otp_code, :string
    add_column :users, :otp_expires_at, :datetime
    add_column :users, :session_token, :string
    add_column :users, :session_expires_at, :datetime
    add_column :users, :last_login_at, :datetime

    # Add indexes
    add_index :users, :phone_number, unique: true
    add_index :users, :session_token, unique: true

    # Make email optional (we'll use phone as primary identifier)
    change_column_null :users, :email, true
    remove_index :users, :email
    add_index :users, :email, unique: true, where: "email IS NOT NULL"
  end
end
