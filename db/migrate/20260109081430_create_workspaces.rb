class CreateWorkspaces < ActiveRecord::Migration[8.0]
  def change
    create_table :workspaces do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :workspace_type, null: false
      t.bigint :owner_id, null: false
      t.string :plan, default: 'free'
      t.jsonb :settings, default: {}
      t.string :logo_url
      t.text :description
      t.boolean :is_active, default: true
      t.datetime :deleted_at

      t.timestamps
    end

    add_index :workspaces, :slug, unique: true
    add_index :workspaces, :owner_id
    add_index :workspaces, :workspace_type
    add_index :workspaces, :deleted_at
    add_foreign_key :workspaces, :users, column: :owner_id
  end
end
