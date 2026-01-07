# frozen_string_literal: true

class CreateGmailConnections < ActiveRecord::Migration[8.0]
  def change
    create_table :gmail_connections do |t|
      t.references :user, null: false, foreign_key: true
      t.string :email, null: false
      t.text :access_token
      t.text :refresh_token
      t.datetime :token_expires_at
      t.datetime :last_sync_at
      t.string :last_history_id
      t.boolean :sync_enabled, default: true, null: false
      t.string :status, default: 'pending', null: false
      t.text :error_message

      t.timestamps
    end

    add_index :gmail_connections, :email
    add_index :gmail_connections, [:user_id, :email], unique: true
    add_index :gmail_connections, :status
    add_index :gmail_connections, :sync_enabled
  end
end
