# frozen_string_literal: true

class AddSubcategoryToUserRulesAndLabeledExamples < ActiveRecord::Migration[7.1]
  def change
    # Add subcategory reference to user_rules for learning subcategory patterns
    add_reference :user_rules, :subcategory, foreign_key: true, null: true

    # Add subcategory reference to labeled_examples for embedding-based subcategory matching
    add_reference :labeled_examples, :subcategory, foreign_key: true, null: true

    # Add index for faster subcategory lookups in rules
    add_index :user_rules, [:category_id, :subcategory_id], name: 'idx_user_rules_category_subcategory'
  end
end
