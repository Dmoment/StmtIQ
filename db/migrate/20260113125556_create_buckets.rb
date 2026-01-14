class CreateBuckets < ActiveRecord::Migration[8.0]
  def change
    create_table :buckets do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.string :name, null: false
      t.text :description
      t.string :bucket_type, default: "monthly"
      t.integer :month
      t.integer :year
      t.string :financial_year
      t.string :status, default: "draft"
      t.datetime :finalized_at
      t.datetime :shared_at

      t.timestamps
    end

    add_index :buckets, [:workspace_id, :month, :year], unique: true, where: "bucket_type = 'monthly'"
    add_index :buckets, [:workspace_id, :financial_year]
    add_index :buckets, :status
  end
end
