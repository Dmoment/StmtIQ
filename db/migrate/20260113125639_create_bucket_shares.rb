class CreateBucketShares < ActiveRecord::Migration[8.0]
  def change
    create_table :bucket_shares do |t|
      t.references :bucket, null: false, foreign_key: true
      t.references :shared_by, null: false, foreign_key: { to_table: :users }
      t.string :shared_with_email, null: false
      t.string :shared_with_name
      t.string :access_token, null: false
      t.string :permission, default: "view"
      t.text :message
      t.datetime :expires_at
      t.datetime :accessed_at
      t.integer :access_count, default: 0
      t.boolean :active, default: true

      t.timestamps
    end

    add_index :bucket_shares, :access_token, unique: true
    add_index :bucket_shares, :shared_with_email
    add_index :bucket_shares, [:bucket_id, :shared_with_email], unique: true
    add_index :bucket_shares, :expires_at
  end
end
