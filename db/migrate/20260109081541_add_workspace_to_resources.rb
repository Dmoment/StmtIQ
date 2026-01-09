class AddWorkspaceToResources < ActiveRecord::Migration[8.0]
  def change
    # Add workspace_id to all resource tables (nullable initially for data migration)
    add_reference :accounts, :workspace, foreign_key: true, index: true
    add_reference :statements, :workspace, foreign_key: true, index: true
    add_reference :transactions, :workspace, foreign_key: true, index: true
    add_reference :user_rules, :workspace, foreign_key: true, index: true
    add_reference :labeled_examples, :workspace, foreign_key: true, index: true
    add_reference :invoices, :workspace, foreign_key: true, index: true
    add_reference :gmail_connections, :workspace, foreign_key: true, index: true

    # Add current_workspace_id to users
    add_reference :users, :current_workspace, foreign_key: { to_table: :workspaces }, index: true

    # Add composite indexes for better query performance
    add_index :accounts, [:workspace_id, :user_id]
    add_index :transactions, [:workspace_id, :transaction_date]
    add_index :transactions, [:workspace_id, :category_id]
    add_index :invoices, [:workspace_id, :status]
  end
end
