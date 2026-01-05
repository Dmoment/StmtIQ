# frozen_string_literal: true

class CreateGlobalPatterns < ActiveRecord::Migration[8.0]
  def change
    create_table :global_patterns do |t|
      # The pattern (normalized keyword)
      t.string :pattern, null: false
      t.string :pattern_type, default: 'keyword' # keyword, prefix, suffix

      # Category this pattern maps to
      t.references :category, null: false, foreign_key: true

      # Verification tracking
      t.integer :occurrence_count, default: 1 # How many times seen
      t.integer :user_count, default: 1 # How many unique users
      t.integer :agreement_count, default: 1 # Users who agreed on this category
      t.boolean :is_verified, default: false # True when meets threshold
      t.datetime :verified_at

      # Match tracking
      t.integer :match_count, default: 0
      t.datetime :last_matched_at

      # Source tracking
      t.string :source, default: 'llm_auto' # llm_auto, admin, import
      t.jsonb :user_ids, default: [] # Track which users contributed

      t.timestamps
    end

    # Unique pattern per category
    add_index :global_patterns, [:pattern, :category_id], unique: true

    # Fast lookups
    add_index :global_patterns, :pattern
    add_index :global_patterns, :is_verified
    add_index :global_patterns, [:is_verified, :pattern]
  end
end
