# frozen_string_literal: true

class CreateUserRules < ActiveRecord::Migration[8.0]
  def change
    create_table :user_rules do |t|
      t.references :user, null: false, foreign_key: true
      t.references :category, null: false, foreign_key: true

      # Pattern matching
      t.string :pattern, null: false           # The pattern to match (keyword, regex)
      t.string :pattern_type, default: 'keyword' # keyword, regex, exact
      t.string :match_field, default: 'description' # description, normalized, amount_range

      # Optional amount range (for matching by amount)
      t.decimal :amount_min
      t.decimal :amount_max

      # Rule metadata
      t.boolean :is_active, default: true
      t.integer :priority, default: 0          # Higher = checked first
      t.integer :match_count, default: 0       # How many times this rule matched
      t.datetime :last_matched_at

      # Audit trail
      t.bigint :source_transaction_id          # Transaction that created this rule (if from feedback)
      t.string :source, default: 'manual'      # manual, feedback, import

      t.timestamps
    end

    # Indexes for efficient lookup
    add_index :user_rules, [:user_id, :is_active, :priority], name: 'idx_user_rules_lookup'
    add_index :user_rules, [:user_id, :pattern], unique: true, name: 'idx_user_rules_unique_pattern'
  end
end
