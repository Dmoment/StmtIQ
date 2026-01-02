class CreateStatementAnalytics < ActiveRecord::Migration[8.0]
  def change
    create_table :statement_analytics do |t|
      t.references :statement, null: false, foreign_key: true, index: { unique: true }
      t.datetime :computed_at
      t.jsonb :monthly_spend, default: {}
      t.jsonb :category_breakdown, default: {}
      t.jsonb :merchant_breakdown, default: {}
      t.jsonb :recurring_expenses, default: {}
      t.jsonb :silent_drains, default: {}
      t.jsonb :weekend_weekday, default: {}
      t.jsonb :largest_expense, default: {}
      t.jsonb :income_expense_ratio, default: {}

      t.timestamps
    end

    # Index for fast lookups
    add_index :statement_analytics, :computed_at
  end
end
