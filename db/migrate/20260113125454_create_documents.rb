class CreateDocuments < ActiveRecord::Migration[8.0]
  def change
    create_table :documents do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :folder, foreign_key: true
      t.string :name, null: false
      t.string :document_type, null: false, default: "other"
      t.text :description
      t.jsonb :metadata, default: {}
      t.date :document_date
      t.string :financial_year
      t.string :tags, array: true, default: []
      t.decimal :amount, precision: 15, scale: 2
      t.string :currency, default: "INR"
      t.string :reference_number
      t.string :source

      t.timestamps
    end

    add_index :documents, :document_type
    add_index :documents, :document_date
    add_index :documents, :financial_year
    add_index :documents, :tags, using: :gin
    add_index :documents, [:workspace_id, :folder_id]
    add_index :documents, [:workspace_id, :document_type]
    add_index :documents, [:workspace_id, :financial_year]
  end
end
