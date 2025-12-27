class CreateCategories < ActiveRecord::Migration[8.0]
  def change
    create_table :categories do |t|
      t.string :name
      t.string :slug
      t.string :icon
      t.string :color
      t.integer :parent_id
      t.boolean :is_system
      t.text :description

      t.timestamps
    end
  end
end
