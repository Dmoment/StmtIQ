class CreateWorkspaceInvitations < ActiveRecord::Migration[8.0]
  def change
    create_table :workspace_invitations do |t|
      t.references :workspace, null: false, foreign_key: true
      t.bigint :invited_by_id, null: false
      t.string :email
      t.string :phone_number
      t.string :role, null: false
      t.string :token, null: false
      t.string :status, default: 'pending'
      t.datetime :expires_at, null: false
      t.datetime :accepted_at

      t.timestamps
    end

    add_index :workspace_invitations, :token, unique: true
    add_index :workspace_invitations, :email
    add_index :workspace_invitations, :phone_number
    add_index :workspace_invitations, :status
    add_index :workspace_invitations, :expires_at
    add_foreign_key :workspace_invitations, :users, column: :invited_by_id
  end
end
