# frozen_string_literal: true

class AddCategorizationStatusToTransactions < ActiveRecord::Migration[8.0]
  def change
    # Status: pending, processing, completed, failed
    add_column :transactions, :categorization_status, :string, default: 'pending'
    add_index :transactions, :categorization_status
  end
end
