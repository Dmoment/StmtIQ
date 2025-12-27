class CreateStatements < ActiveRecord::Migration[8.0]
  def change
    create_table :statements do |t|
      t.references :user, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.string :file_name
      t.string :file_type
      t.string :status
      t.datetime :parsed_at
      t.text :error_message
      t.jsonb :metadata

      t.timestamps
    end
  end
end
