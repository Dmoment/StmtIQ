class ChangeStatusToIntegerInStatementAnalytics < ActiveRecord::Migration[8.0]
  def up
    # Map string values to integer enum values
    status_map = {
      'pending' => 0,
      'queued' => 1,
      'running' => 2,
      'completed' => 3,
      'failed' => 4
    }

    # Update existing records to use integer values
    status_map.each do |string_value, int_value|
      execute <<-SQL
        UPDATE statement_analytics
        SET status = #{int_value}
        WHERE status = '#{string_value}'
      SQL
    end

    # Remove default first
    change_column_default :statement_analytics, :status, nil

    # Change column type from string to integer
    change_column :statement_analytics, :status, :integer, using: 'status::integer', null: false

    # Add default back
    change_column_default :statement_analytics, :status, 0
  end

  def down
    # Map integer values back to string values
    status_map = {
      0 => 'pending',
      1 => 'queued',
      2 => 'running',
      3 => 'completed',
      4 => 'failed'
    }

    # Change column type from integer to string
    change_column :statement_analytics, :status, :string, default: 'pending', null: false

    # Update existing records to use string values
    status_map.each do |int_value, string_value|
      execute <<-SQL
        UPDATE statement_analytics
        SET status = '#{string_value}'
        WHERE status = #{int_value}
      SQL
    end
  end
end
