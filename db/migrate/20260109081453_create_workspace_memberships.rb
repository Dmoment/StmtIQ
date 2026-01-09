class CreateWorkspaceMemberships < ActiveRecord::Migration[8.0]
  def change
    create_table :workspace_memberships do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :role, null: false
      t.string :status, default: 'active'
      t.jsonb :permissions, default: {}
      t.datetime :joined_at
      t.datetime :last_accessed_at

      t.timestamps
    end

    add_index :workspace_memberships, [:workspace_id, :user_id], unique: true
    add_index :workspace_memberships, :role
    add_index :workspace_memberships, :status
  end
end
