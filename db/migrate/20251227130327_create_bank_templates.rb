# frozen_string_literal: true

class CreateBankTemplates < ActiveRecord::Migration[8.0]
  def change
    create_table :bank_templates do |t|
      t.string :bank_name, null: false
      t.string :bank_code, null: false          # e.g., 'hdfc', 'icici', 'sbi'
      t.string :account_type, null: false       # e.g., 'savings', 'current', 'credit_card'
      t.string :file_format, null: false        # e.g., 'csv', 'xls', 'xlsx', 'pdf'
      t.string :logo_url
      t.text :description
      t.jsonb :column_mappings, default: {}     # Maps statement columns to our fields
      t.jsonb :parser_config, default: {}       # Additional parser configuration
      t.boolean :is_active, default: true
      t.integer :display_order, default: 0

      t.timestamps
    end

    add_index :bank_templates, [:bank_code, :account_type, :file_format], unique: true, name: 'idx_bank_templates_unique'
    add_index :bank_templates, :is_active
  end
end
