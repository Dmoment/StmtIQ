class CreateFolders < ActiveRecord::Migration[8.0]
  def change
    create_table :folders do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :parent, foreign_key: { to_table: :folders }
      t.string :name, null: false
      t.text :description
      t.string :color, default: "slate"
      t.string :icon
      t.integer :position, default: 0

      t.timestamps
    end

    add_index :folders, [:workspace_id, :parent_id, :name], unique: true
    add_index :folders, [:workspace_id, :position]
  end
end
