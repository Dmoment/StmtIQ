class AddStatusToStatementAnalytics < ActiveRecord::Migration[8.0]
  def change
    add_column :statement_analytics, :status, :integer, default: 0, null: false
    add_column :statement_analytics, :error_message, :text
    add_column :statement_analytics, :started_at, :datetime
    add_index :statement_analytics, :status
    add_index :statement_analytics, :computed_at unless index_exists?(:statement_analytics, :computed_at)
  end
end
