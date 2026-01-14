class CreateBucketItems < ActiveRecord::Migration[8.0]
  def change
    create_table :bucket_items do |t|
      t.references :bucket, null: false, foreign_key: true
      t.references :document, null: false, foreign_key: true
      t.integer :position, default: 0
      t.text :notes

      t.timestamps
    end

    add_index :bucket_items, [:bucket_id, :document_id], unique: true
    add_index :bucket_items, [:bucket_id, :position]
  end
end
